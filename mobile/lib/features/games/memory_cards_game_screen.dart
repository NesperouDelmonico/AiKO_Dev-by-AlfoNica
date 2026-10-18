import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import 'game_outcome.dart';
import 'game_shell.dart';
import 'text_match.dart';

class MemoryCard {
  const MemoryCard({required this.imagenId, required this.respuestas});

  final String imagenId;
  final List<String> respuestas;

  static MemoryCard? fromJson(Map<String, dynamic> json) {
    final id = json['imagen_id'] as String?;
    final answers = (json['respuestas'] as List?)?.whereType<String>().toList();
    if (id == null || answers == null || answers.isEmpty) return null;
    return MemoryCard(imagenId: id, respuestas: answers);
  }
}

enum _Phase { loading, memorize, answer, review }

/// Recordar imágenes: se muestran las tarjetas durante [segundos], se
/// voltean con animación de carta y el paciente escribe qué era cada una.
/// Acierta si su texto contiene alguna palabra clave del especialista.
class MemoryCardsGameScreen extends StatefulWidget {
  const MemoryCardsGameScreen({
    super.key,
    required this.cards,
    required this.segundos,
  });

  final List<MemoryCard> cards;
  final int segundos;

  @override
  State<MemoryCardsGameScreen> createState() => _MemoryCardsGameScreenState();
}

class _MemoryCardsGameScreenState extends State<MemoryCardsGameScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _flip = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  );
  late final List<TextEditingController> _answers =
      List.generate(widget.cards.length, (_) => TextEditingController());
  final _answerClock = Stopwatch();
  Timer? _ticker;
  _Phase _phase = _Phase.loading;
  int _remaining = 0;
  List<bool> _results = const [];
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    // El tiempo para memorizar empieza cuando las imágenes ya cargaron.
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
    _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remaining <= 1) {
        timer.cancel();
        _hide();
      } else {
        setState(() => _remaining--);
      }
    });
  }

  Future<void> _hide() async {
    if (!mounted) return;
    await _flip.forward();
    if (!mounted) return;
    _answerClock.start();
    setState(() => _phase = _Phase.answer);
  }

  Future<void> _check() async {
    FocusScope.of(context).unfocus();
    _answerClock.stop();
    setState(() {
      _results = [
        for (var i = 0; i < widget.cards.length; i++)
          matchesAnyKeyword(_answers[i].text, widget.cards[i].respuestas),
      ];
      _phase = _Phase.review;
    });
    await _flip.reverse();
  }

  void _finish() {
    final hits = _results.where((ok) => ok).length;
    final total = widget.cards.length;
    Navigator.of(context).pop(GameOutcome(
      puntaje: ((hits * 100) / total).round(),
      aciertos: hits,
      intentos: total,
      tiempoReaccionMs: _answerClock.elapsedMilliseconds,
    ));
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _flip.dispose();
    for (final controller in _answers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hits = _results.where((ok) => ok).length;
    final progress = switch (_phase) {
      _Phase.loading => 0.0,
      _Phase.memorize =>
        0.4 * (1 - _remaining / max(1, widget.segundos)),
      _Phase.answer => 0.6,
      _Phase.review => 1.0,
    };
    return GameShell(
      progress: progress,
      bottom: switch (_phase) {
        _Phase.answer => CheckBar(label: 'COMPROBAR', onPressed: _check),
        _Phase.review => CheckBar(
            label: 'CONTINUAR',
            onPressed: _finish,
            correct: hits * 2 >= widget.cards.length,
            feedback: 'Recordaste $hits de ${widget.cards.length}',
          ),
        _ => null,
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Text(
            switch (_phase) {
              _Phase.loading => 'Preparando las imágenes…',
              _Phase.memorize => 'Memoriza las imágenes',
              _Phase.answer => '¿Qué había en cada tarjeta?',
              _Phase.review => 'Así te fue',
            },
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          if (_phase == _Phase.memorize)
            Semantics(
              liveRegion: true,
              child: Text('Se voltean en $_remaining s',
                  style: const TextStyle(
                      fontSize: 16, color: AikoColors.inkSoft)),
            )
          else if (_phase == _Phase.answer)
            const Text('Escribe una o dos palabras debajo de cada tarjeta.',
                style: TextStyle(fontSize: 16, color: AikoColors.inkSoft)),
          const SizedBox(height: 16),
          if (_phase == _Phase.loading)
            const Padding(
              padding: EdgeInsets.only(top: 60),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            LayoutBuilder(builder: (context, constraints) {
              final columns = widget.cards.length == 1 ? 1 : 2;
              final width =
                  (constraints.maxWidth - 14 * (columns - 1)) / columns;
              return Wrap(
                spacing: 14,
                runSpacing: 18,
                children: [
                  for (var i = 0; i < widget.cards.length; i++)
                    SizedBox(width: width, child: _cardWithField(i, width)),
                ],
              );
            }),
        ],
      ),
    );
  }

  Widget _cardWithField(int index, double width) {
    final card = widget.cards[index];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _FlipCard(
          animation: _flip,
          size: width,
          number: index + 1,
          front: Image.network(
            AppConfig.imageUrl(card.imagenId),
            fit: BoxFit.cover,
            semanticLabel: 'Tarjeta ${index + 1}',
            errorBuilder: (_, __, ___) => const Icon(
                Icons.broken_image_rounded,
                size: 40,
                color: AikoColors.inkSoft),
          ),
          badge: _phase == _Phase.review ? _results[index] : null,
        ),
        if (_phase == _Phase.answer || _phase == _Phase.review) ...[
          const SizedBox(height: 8),
          TextField(
            controller: _answers[index],
            enabled: _phase == _Phase.answer,
            textInputAction: index == widget.cards.length - 1
                ? TextInputAction.done
                : TextInputAction.next,
            style: const TextStyle(fontSize: 17),
            decoration: InputDecoration(
              labelText: 'Tarjeta ${index + 1}',
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
          if (_phase == _Phase.review && !_results[index])
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Era: ${card.respuestas.first}',
                  style: const TextStyle(color: AikoColors.inkSoft)),
            ),
        ],
      ],
    );
  }
}

/// Tarjeta que gira sobre el eje Y: imagen al frente, dorso con su número.
class _FlipCard extends StatelessWidget {
  const _FlipCard({
    required this.animation,
    required this.size,
    required this.number,
    required this.front,
    this.badge,
  });

  final Animation<double> animation;
  final double size;
  final int number;
  final Widget front;
  final bool? badge;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (context, _) {
        final angle = animation.value * pi;
        final showBack = angle > pi / 2;
        return Transform(
          alignment: Alignment.center,
          transform: Matrix4.identity()
            ..setEntry(3, 2, 0.0012)
            ..rotateY(angle),
          child: SizedBox(
            height: size,
            width: size,
            child: showBack
                ? Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()..rotateY(pi),
                    child: _back(),
                  )
                : _front(),
          ),
        );
      },
    );
  }

  Widget _front() => Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: ColoredBox(color: Colors.white, child: front),
          ),
          if (badge != null)
            Positioned(
              top: 8,
              right: 8,
              child: CircleAvatar(
                radius: 18,
                backgroundColor: badge! ? AikoColors.success : const Color(0xFFE07B39),
                child: Icon(badge! ? Icons.check_rounded : Icons.close_rounded,
                    color: Colors.white),
              ),
            ),
        ],
      );

  Widget _back() => Container(
        decoration: BoxDecoration(
          gradient: AikoColors.heroGradient,
          borderRadius: BorderRadius.circular(20),
        ),
        alignment: Alignment.center,
        child: Text('$number',
            style: const TextStyle(
                fontSize: 48,
                fontWeight: FontWeight.w800,
                color: Colors.white)),
      );
}
