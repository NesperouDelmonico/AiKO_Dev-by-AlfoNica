import 'dart:async';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import 'drawing_pad.dart';
import 'game_outcome.dart';
import 'game_shell.dart';
import 'text_match.dart';

class MemoryCard {
  const MemoryCard({required this.imagenId, required this.respuestas});

  final String imagenId;
  final List<String> respuestas;

  static MemoryCard? fromJson(Map<String, dynamic> json) {
    final id = json['imagen_id'] as String?;
    final answers =
        (json['respuestas'] as List?)?.whereType<String>().toList() ?? const <String>[];
    if (id == null) return null;
    return MemoryCard(imagenId: id, respuestas: answers);
  }
}

/// Cómo recuerda el paciente las imágenes.
enum RecallMode {
  /// Escribe el nombre de cada tarjeta.
  nombrar,

  /// Se muestra una imagen y toca la tarjeta donde estaba.
  relacionar;

  static RecallMode parse(String? value) =>
      value == 'relacionar' ? relacionar : nombrar;
}

enum _Phase { loading, memorize, recall, review }

/// Recordar imágenes: se muestran durante [segundos] y se ocultan. Luego
/// el paciente las nombra o las relaciona con su tarjeta; al final puede
/// dibujar lo que recuerda (el dibujo no cuenta para el puntaje: lo revisa
/// el especialista). [duracionSegundos] es el tiempo total de la partida.
class MemoryCardsGameScreen extends StatefulWidget {
  const MemoryCardsGameScreen({
    super.key,
    required this.cards,
    required this.segundos,
    this.duracionSegundos = 300,
    this.modo = RecallMode.nombrar,
    this.dibujar = true,
    this.random,
  });

  final List<MemoryCard> cards;
  final int segundos;
  final int duracionSegundos;
  final RecallMode modo;
  final bool dibujar;
  final Random? random;

  @override
  State<MemoryCardsGameScreen> createState() => _MemoryCardsGameScreenState();
}

class _MemoryCardsGameScreenState extends State<MemoryCardsGameScreen> {
  late final Random _random = widget.random ?? Random();
  late final List<TextEditingController> _answers =
      List.generate(widget.cards.length, (_) => TextEditingController());
  late final List<int> _askOrder =
      List.generate(widget.cards.length, (i) => i)..shuffle(_random);
  final _answerClock = Stopwatch();
  Timer? _memorizeTicker;
  Timer? _totalTicker;
  _Phase _phase = _Phase.loading;
  int _remaining = 0;
  late int _totalLeft = widget.duracionSegundos;
  bool _started = false;
  bool _done = false;

  // Resultado por tarjeta (null = sin responder).
  late final List<bool?> _results = List.filled(widget.cards.length, null);
  // Relacionar: cuál se pregunta ahora y qué tarjeta se tocó mal.
  int _ask = 0;
  int? _wrongTap;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    // El tiempo empieza cuando las imágenes ya cargaron.
    Future.wait(widget.cards.map((card) => precacheImage(
          NetworkImage(AppConfig.imageUrl(card.imagenId)),
          context,
          onError: (_, __) {},
        ))).whenComplete(_startMemorize);
  }

  void _startMemorize() {
    if (!mounted) return;
    setState(() {
      _phase = _Phase.memorize;
      _remaining = widget.segundos;
    });
    _totalTicker = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_totalLeft <= 1) {
        timer.cancel();
        if (_phase == _Phase.memorize) _hide();
        _check();
      } else {
        setState(() => _totalLeft--);
      }
    });
    _memorizeTicker = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remaining <= 1) {
        timer.cancel();
        _hide();
      } else {
        setState(() => _remaining--);
      }
    });
  }

  void _hide() {
    if (!mounted || _phase != _Phase.memorize) return;
    _memorizeTicker?.cancel();
    _answerClock.start();
    setState(() => _phase = _Phase.recall);
  }

  void _check() {
    if (_phase != _Phase.recall) return;
    FocusScope.of(context).unfocus();
    _answerClock.stop();
    _totalTicker?.cancel();
    setState(() {
      for (var i = 0; i < widget.cards.length; i++) {
        _results[i] ??= widget.modo == RecallMode.nombrar
            ? matchesAnyKeyword(_answers[i].text, widget.cards[i].respuestas)
            : false;
      }
      _phase = _Phase.review;
    });
  }

  void _relate(int tapped) {
    if (_phase != _Phase.recall || _wrongTap != null) return;
    final target = _askOrder[_ask];
    final ok = tapped == target;
    setState(() {
      _results[target] = ok;
      if (!ok) _wrongTap = tapped;
    });
    Future.delayed(Duration(milliseconds: ok ? 700 : 1200), () {
      if (!mounted || _phase != _Phase.recall) return;
      setState(() {
        _wrongTap = null;
        _ask++;
      });
      if (_ask >= widget.cards.length) _check();
    });
  }

  Future<void> _finish() async {
    if (_done) return;
    _done = true;
    final drawings = <Uint8List>[];
    if (widget.dibujar) {
      final png = await Navigator.of(context).push<Uint8List>(
        MaterialPageRoute(builder: (_) => const DrawingScreen()),
      );
      if (png != null) drawings.add(png);
    }
    if (!mounted) return;
    final hits = _results.where((ok) => ok == true).length;
    final total = widget.cards.length;
    Navigator.of(context).pop(GameOutcome(
      puntaje: ((hits * 100) / total).round(),
      aciertos: hits,
      intentos: total,
      tiempoReaccionMs: _answerClock.elapsedMilliseconds,
      dibujos: drawings,
    ));
  }

  @override
  void dispose() {
    _memorizeTicker?.cancel();
    _totalTicker?.cancel();
    for (final controller in _answers) {
      controller.dispose();
    }
    super.dispose();
  }

  String get _totalText {
    final m = _totalLeft ~/ 60;
    final s = (_totalLeft % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final hits = _results.where((ok) => ok == true).length;
    final relate = widget.modo == RecallMode.relacionar;
    final progress = switch (_phase) {
      _Phase.loading => 0.0,
      _Phase.memorize => 0.4 * (1 - _remaining / max(1, widget.segundos)),
      _Phase.recall => relate ? 0.4 + 0.6 * _ask / widget.cards.length : 0.6,
      _Phase.review => 1.0,
    };
    return GameShell(
      progress: progress,
      title: switch (_phase) {
        _Phase.loading => 'Preparando las imágenes…',
        _Phase.memorize => 'Observa las imágenes',
        _Phase.recall => relate ? '¿Dónde estaba esta imagen?' : '¿Qué había en cada tarjeta?',
        _Phase.review => 'Así te fue',
      },
      subtitle: switch (_phase) {
        _Phase.memorize => 'Recuerda qué hay en cada tarjeta y dónde está.',
        _Phase.recall => relate
            ? 'Toca la tarjeta donde la viste.'
            : 'Escribe una o dos palabras debajo de cada tarjeta.',
        _ => null,
      },
      trailing: switch (_phase) {
        _Phase.memorize => TimerPill(
            text: '$_remaining ${_remaining == 1 ? 'segundo' : 'segundos'}',
            semantics: 'Se ocultan en $_remaining segundos',
            urgent: _remaining <= 2,
          ),
        _Phase.recall => TimerPill(
            text: _totalText,
            semantics: 'Tiempo restante $_totalText',
            urgent: _totalLeft <= 20,
          ),
        _ => null,
      },
      bottom: switch (_phase) {
        _Phase.recall when !relate => CheckBar(label: 'COMPROBAR', onPressed: _check),
        _Phase.review => CheckBar(
            label: widget.dibujar ? 'AHORA, A DIBUJAR' : 'CONTINUAR',
            onPressed: _finish,
            correct: hits * 2 >= widget.cards.length,
            feedback: 'Recordaste $hits de ${widget.cards.length}',
          ),
        _ => null,
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
        children: [
          if (_phase == _Phase.loading)
            const Padding(
              padding: EdgeInsets.only(top: 60),
              child: Center(child: CircularProgressIndicator()),
            )
          else ...[
            if (_phase == _Phase.recall && relate && _ask < widget.cards.length) ...[
              Center(
                child: SizedBox(
                  width: 150,
                  height: 150,
                  child: _CardFace(
                    imagenId: widget.cards[_askOrder[_ask]].imagenId,
                    label: 'Imagen a ubicar',
                  ),
                ),
              ),
              const SizedBox(height: 18),
            ],
            LayoutBuilder(builder: (context, constraints) {
              final count = widget.cards.length;
              final columns = relate ? (count <= 4 ? 2 : 3) : 2;
              final width = (constraints.maxWidth - 14 * (columns - 1)) / columns;
              return Wrap(
                spacing: 14,
                runSpacing: 18,
                children: [
                  for (var i = 0; i < count; i++)
                    SizedBox(width: width, child: _card(i, width, relate)),
                ],
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _card(int index, double width, bool relate) {
    final card = widget.cards[index];
    final revealed = _phase == _Phase.memorize ||
        _phase == _Phase.review ||
        (relate && _results[index] == true);
    final badge = _phase == _Phase.review || (relate && _results[index] != null)
        ? _results[index]
        : null;
    final face = AnimatedSwitcher(
      duration: const Duration(milliseconds: 450),
      transitionBuilder: (child, animation) =>
          ScaleTransition(scale: animation, child: child),
      child: SizedBox(
        key: ValueKey(revealed),
        height: width,
        width: width,
        child: revealed
            ? _CardFace(imagenId: card.imagenId, label: 'Tarjeta ${index + 1}', badge: badge)
            : _CardBack(number: index + 1, wrong: _wrongTap == index),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (relate && _phase == _Phase.recall && !revealed)
          Semantics(
            button: true,
            label: 'Tarjeta ${index + 1}',
            excludeSemantics: true,
            child: GestureDetector(onTap: () => _relate(index), child: face),
          )
        else
          face,
        if (!relate && (_phase == _Phase.recall || _phase == _Phase.review)) ...[
          const SizedBox(height: 8),
          TextField(
            controller: _answers[index],
            enabled: _phase == _Phase.recall,
            textInputAction: index == widget.cards.length - 1
                ? TextInputAction.done
                : TextInputAction.next,
            style: const TextStyle(fontSize: 17),
            decoration: InputDecoration(
              labelText: 'Tarjeta ${index + 1}',
              filled: true,
              fillColor: AikoColors.surface,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          if (_phase == _Phase.review && _results[index] != true && card.respuestas.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Era: ${card.respuestas.first}',
                  style: TextStyle(color: AikoColors.inkSoft)),
            ),
        ],
      ],
    );
  }
}

class _CardFace extends StatelessWidget {
  const _CardFace({required this.imagenId, required this.label, this.badge});

  final String imagenId;
  final String label;
  final bool? badge;

  @override
  Widget build(BuildContext context) => Stack(
        fit: StackFit.expand,
        children: [
          Container(
            decoration: softCard(radius: 20),
            clipBehavior: Clip.antiAlias,
            child: Image.network(
              AppConfig.imageUrl(imagenId),
              fit: BoxFit.cover,
              semanticLabel: label,
              errorBuilder: (_, __, ___) => Icon(Icons.broken_image_rounded,
                  size: 40, color: AikoColors.inkSoft),
            ),
          ),
          if (badge != null)
            Positioned(
              top: 8,
              right: 8,
              child: CircleAvatar(
                radius: 18,
                backgroundColor: badge! ? AikoColors.success : const Color(0xFFD9534F),
                child: Icon(badge! ? Icons.check_rounded : Icons.close_rounded,
                    color: Colors.white),
              ),
            ),
        ],
      );
}

class _CardBack extends StatelessWidget {
  const _CardBack({required this.number, this.wrong = false});
  final int number;
  final bool wrong;

  @override
  Widget build(BuildContext context) => AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          gradient: wrong ? null : AikoColors.heroGradient,
          color: wrong ? const Color(0xFFD9534F) : null,
          borderRadius: BorderRadius.circular(20),
        ),
        alignment: Alignment.center,
        child: Text('$number',
            style: const TextStyle(
                fontSize: 44, fontWeight: FontWeight.w800, color: Colors.white)),
      );
}
