import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme.dart';
import 'game_outcome.dart';
import 'game_shell.dart';
import 'tones.dart';

/// Colores y nombres de los botones (hasta 9).
const sequenceColors = [
  (Color(0xFFE5484D), 'rojo'),
  (Color(0xFF3E7BFA), 'azul'),
  (Color(0xFF30A46C), 'verde'),
  (Color(0xFFF5B800), 'amarillo'),
  (Color(0xFF8E4EC6), 'morado'),
  (Color(0xFFF76808), 'naranja'),
  (Color(0xFFE93D82), 'rosado'),
  (Color(0xFF12A594), 'turquesa'),
  (Color(0xFF8D6346), 'café'),
];

enum _Phase { ready, showing, input, feedback }

/// Secuencia de colores (tipo Simon): los botones se iluminan con su nota
/// y el paciente repite la secuencia. Cada ronda agrega un paso. Un error
/// o quedarse sin tiempo gasta un intento y repite la ronda.
class ColorSequenceGameScreen extends StatefulWidget {
  const ColorSequenceGameScreen({
    super.key,
    required this.botones,
    required this.rondas,
    required this.intentos,
    required this.tiempoRespuestaSegundos,
    this.tones,
    this.random,
  });

  final int botones;
  final int rondas;
  final int intentos;
  final int tiempoRespuestaSegundos;

  /// Sonido de las notas; por defecto, audio real.
  final TonePlayer? tones;
  final Random? random;

  @override
  State<ColorSequenceGameScreen> createState() => _ColorSequenceGameScreenState();
}

class _ColorSequenceGameScreenState extends State<ColorSequenceGameScreen> {
  late final Random _random = widget.random ?? Random();
  late final TonePlayer _tones = widget.tones ?? AudioTonePlayer(widget.botones);
  late final List<int> _sequence =
      List.generate(widget.rondas + 1, (_) => _random.nextInt(widget.botones));
  final _clock = Stopwatch();
  final List<int> _roundTimes = [];

  _Phase _phase = _Phase.ready;
  int _round = 0; // rondas superadas
  int _errors = 0;
  int _step = 0; // toques correctos en la ronda actual
  int? _lit;
  late int _secondsLeft = widget.tiempoRespuestaSegundos;
  Timer? _timer;
  String? _message;
  bool _messageGood = true;
  bool _done = false;

  int get _length => _round + 2;
  int get _livesLeft => max(0, widget.intentos - _errors);

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 900), _show);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _tones.dispose();
    super.dispose();
  }

  Future<void> _show() async {
    if (!mounted || _done) return;
    setState(() {
      _phase = _Phase.showing;
      _message = null;
      _step = 0;
    });
    // Un poco más rápido en rondas avanzadas.
    final on = max(320, 560 - _round * 25);
    for (var i = 0; i < _length; i++) {
      if (!mounted || _done) return;
      await _flash(_sequence[i], on);
      await Future.delayed(const Duration(milliseconds: 180));
    }
    if (!mounted || _done) return;
    _startInput();
  }

  Future<void> _flash(int button, int ms) async {
    setState(() => _lit = button);
    unawaited(_tones.play(button));
    await Future.delayed(Duration(milliseconds: ms));
    if (mounted) setState(() => _lit = null);
  }

  void _startInput() {
    _clock
      ..reset()
      ..start();
    setState(() {
      _phase = _Phase.input;
      _secondsLeft = widget.tiempoRespuestaSegundos;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft <= 1) {
        timer.cancel();
        _miss('Se acabó el tiempo de la ronda.');
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  void _tap(int button) {
    if (_phase != _Phase.input) return;
    unawaited(_flash(button, 220));
    if (button != _sequence[_step]) {
      _miss('Ese no era. Mira otra vez.');
      return;
    }
    _step++;
    if (_step < _length) {
      setState(() {});
      return;
    }
    _timer?.cancel();
    _roundTimes.add(_clock.elapsedMilliseconds);
    _round++;
    if (_round >= widget.rondas) {
      _feedback('¡Secuencia completa!', true, _finish);
    } else {
      _feedback('¡Muy bien! Viene una nota más.', true, _show);
    }
  }

  void _miss(String text) {
    _timer?.cancel();
    _errors++;
    if (_livesLeft == 0) {
      _feedback('Se acabaron los intentos.', false, _finish);
    } else {
      _feedback('$text Te quedan $_livesLeft.', false, _show);
    }
  }

  void _feedback(String text, bool good, VoidCallback then) {
    setState(() {
      _phase = _Phase.feedback;
      _message = text;
      _messageGood = good;
    });
    Future.delayed(const Duration(milliseconds: 1300), () {
      if (mounted && !_done) then();
    });
  }

  void _finish() {
    if (_done || !mounted) return;
    _done = true;
    _timer?.cancel();
    Navigator.of(context).pop(GameOutcome(
      puntaje: ((_round * 100) / widget.rondas).round().clamp(0, 100),
      aciertos: _round,
      intentos: widget.rondas,
      tiempoReaccionMs: _roundTimes.isEmpty
          ? null
          : (_roundTimes.reduce((a, b) => a + b) / _roundTimes.length).round(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final columns = widget.botones <= 4 ? 2 : 3;
    return GameShell(
      progress: _round / widget.rondas,
      counter: 'Ronda ${min(_round + 1, widget.rondas)}/${widget.rondas}',
      title: switch (_phase) {
        _Phase.ready => 'Prepárate',
        _Phase.showing => 'Mira y escucha',
        _Phase.input => 'Tu turno',
        _Phase.feedback => _messageGood ? '¡Bien!' : 'Casi',
      },
      subtitle: switch (_phase) {
        _Phase.showing => 'Recuerda el orden de los colores.',
        _Phase.input => 'Toca los colores en el mismo orden ($_step de $_length).',
        _Phase.feedback => _message,
        _Phase.ready => 'Los botones se encenderán con una nota.',
      },
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_phase == _Phase.input) ...[
            TimerPill(
              text: '$_secondsLeft s',
              semantics: 'Quedan $_secondsLeft segundos',
              urgent: _secondsLeft <= 3,
            ),
            const SizedBox(width: 10),
          ],
          Semantics(
            label: 'Te quedan $_livesLeft de ${widget.intentos} intentos',
            excludeSemantics: true,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < widget.intentos; i++)
                  Icon(i < _livesLeft ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      size: 22, color: const Color(0xFFE0739C)),
              ],
            ),
          ),
        ],
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: GridView.count(
            shrinkWrap: true,
            padding: const EdgeInsets.all(24),
            crossAxisCount: columns,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            children: [
              for (var i = 0; i < widget.botones; i++)
                _SequenceButton(
                  color: sequenceColors[i].$1,
                  name: sequenceColors[i].$2,
                  lit: _lit == i,
                  enabled: _phase == _Phase.input,
                  onTap: () => _tap(i),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SequenceButton extends StatelessWidget {
  const _SequenceButton({
    required this.color,
    required this.name,
    required this.lit,
    required this.enabled,
    required this.onTap,
  });

  final Color color;
  final String name;
  final bool lit;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dim = Color.lerp(color, Colors.white, 0.45)!;
    return Semantics(
      button: true,
      enabled: enabled,
      label: 'Botón $name',
      excludeSemantics: true,
      child: GestureDetector(
        onTapDown: enabled ? (_) => onTap() : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          decoration: BoxDecoration(
            color: lit ? color : dim,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: lit ? 6 : 3),
            boxShadow: [
              BoxShadow(
                color: lit ? color.withValues(alpha: 0.7) : AikoColors.violet.withValues(alpha: 0.08),
                blurRadius: lit ? 28 : 10,
                spreadRadius: lit ? 4 : 0,
                offset: lit ? Offset.zero : const Offset(0, 6),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
