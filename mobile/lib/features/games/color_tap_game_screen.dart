import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme.dart';
import 'game_outcome.dart';
import 'game_shell.dart';

/// Colores del juego (nombre en pantalla y color del botón).
const tapColors = [
  ('ROJO', Color(0xFFE5484D)),
  ('AZUL', Color(0xFF3E7BFA)),
  ('VERDE', Color(0xFF30A46C)),
  ('AMARILLO', Color(0xFFF5B800)),
  ('MORADO', Color(0xFF8E4EC6)),
  ('NARANJA', Color(0xFFF76808)),
];

enum _Phase { countdown, gap, target, feedback }

/// Toque de color (velocidad): aparece el nombre de un color y el paciente
/// toca rápido el botón de ese color. Con [interferencia] la palabra se
/// pinta de otro color (efecto Stroop) para que tenga que leer, no mirar.
class ColorTapGameScreen extends StatefulWidget {
  const ColorTapGameScreen({
    super.key,
    required this.rondas,
    required this.colores,
    required this.tiempoLimiteMs,
    this.interferencia = false,
    this.random,
  });

  final int rondas;
  final int colores;
  final int tiempoLimiteMs;
  final bool interferencia;
  final Random? random;

  @override
  State<ColorTapGameScreen> createState() => _ColorTapGameScreenState();
}

class _ColorTapGameScreenState extends State<ColorTapGameScreen> {
  late final Random _random = widget.random ?? Random();
  late final List<(String, Color)> _palette = tapColors.take(widget.colores).toList();
  late final List<int> _buttonOrder =
      List.generate(_palette.length, (i) => i)..shuffle(_random);
  final _stopwatch = Stopwatch();
  final List<int> _hits = [];
  Timer? _timer;

  _Phase _phase = _Phase.countdown;
  int _countdown = 3;
  int _round = 0;
  int _word = 0;
  int _ink = 0;
  bool _lastGood = true;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown <= 1) {
        timer.cancel();
        _next();
      } else {
        setState(() => _countdown--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _next() {
    if (!mounted) return;
    if (_round >= widget.rondas) {
      Navigator.of(context).pop(GameOutcome.fromReactions(
        intentos: widget.rondas,
        tiemposAciertoMs: _hits,
      ));
      return;
    }
    setState(() => _phase = _Phase.gap);
    _timer = Timer(Duration(milliseconds: 400 + _random.nextInt(500)), () {
      if (!mounted) return;
      final word = _random.nextInt(_palette.length);
      var ink = word;
      if (widget.interferencia && _palette.length > 1) {
        while (ink == word) {
          ink = _random.nextInt(_palette.length);
        }
      }
      setState(() {
        _word = word;
        _ink = ink;
        _phase = _Phase.target;
      });
      _stopwatch
        ..reset()
        ..start();
      _timer = Timer(Duration(milliseconds: widget.tiempoLimiteMs), () => _resolve(null));
    });
  }

  void _resolve(int? tapped) {
    if (_phase != _Phase.target) return;
    _timer?.cancel();
    _stopwatch.stop();
    final good = tapped == _word;
    if (good) _hits.add(_stopwatch.elapsedMilliseconds);
    setState(() {
      _lastGood = good;
      _phase = _Phase.feedback;
      _round++;
    });
    _timer = Timer(const Duration(milliseconds: 550), _next);
  }

  @override
  Widget build(BuildContext context) {
    final columns = _palette.length <= 4 ? 2 : 3;
    return GameShell(
      progress: _round / widget.rondas,
      counter: '${min(_round + 1, widget.rondas)}/${widget.rondas}',
      title: 'Toca el color que dice la palabra',
      subtitle: widget.interferencia
          ? 'Ojo: lee la palabra, no te fijes en su color.'
          : 'Lo más rápido que puedas.',
      child: Column(
        children: [
          Expanded(
            flex: 4,
            child: Center(child: _center()),
          ),
          Expanded(
            flex: 5,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: GridView.count(
                  shrinkWrap: true,
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                  crossAxisCount: columns,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: columns == 2 ? 1.6 : 1.1,
                  children: [
                    for (final i in _buttonOrder)
                      Semantics(
                        button: true,
                        label: 'Botón ${_palette[i].$1.toLowerCase()}',
                        excludeSemantics: true,
                        child: GestureDetector(
                          onTapDown: _phase == _Phase.target ? (_) => _resolve(i) : null,
                          child: Container(
                            decoration: BoxDecoration(
                              color: _palette[i].$2,
                              borderRadius: BorderRadius.circular(22),
                              boxShadow: [
                                BoxShadow(
                                  color: Color.lerp(_palette[i].$2, Colors.black, 0.25)!,
                                  offset: const Offset(0, 5),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _center() {
    switch (_phase) {
      case _Phase.countdown:
        return Semantics(
          liveRegion: true,
          child: Text('$_countdown',
              style: const TextStyle(
                  fontSize: 80, fontWeight: FontWeight.w900, color: AikoColors.violet)),
        );
      case _Phase.gap:
        return const SizedBox.shrink();
      case _Phase.target:
        return Semantics(
          liveRegion: true,
          label: _palette[_word].$1.toLowerCase(),
          excludeSemantics: true,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 18),
            decoration: softCard(radius: 28),
            child: Text(_palette[_word].$1,
                style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                    color: widget.interferencia ? _palette[_ink].$2 : AikoColors.ink)),
          ),
        );
      case _Phase.feedback:
        return Semantics(
          liveRegion: true,
          label: _lastGood ? 'Correcto' : 'Fallaste',
          child: Icon(_lastGood ? Icons.check_circle_rounded : Icons.cancel_rounded,
              size: 84, color: _lastGood ? AikoColors.success : const Color(0xFFD9534F)),
        );
    }
  }
}
