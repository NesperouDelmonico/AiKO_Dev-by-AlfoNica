import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme.dart';
import 'game_outcome.dart';
import 'game_shell.dart';

/// Figuras del juego: ícono, color y nombre (para lectores de pantalla).
const findFigures = [
  (Icons.star_rounded, Color(0xFFF5B800), 'estrella'),
  (Icons.favorite_rounded, Color(0xFFE5484D), 'corazón'),
  (Icons.pets_rounded, Color(0xFF8D6346), 'huella'),
  (Icons.local_florist_rounded, Color(0xFFE93D82), 'flor'),
  (Icons.wb_sunny_rounded, Color(0xFFF76808), 'sol'),
  (Icons.nightlight_round, Color(0xFF3E63DD), 'luna'),
  (Icons.cloud_rounded, Color(0xFF5BB3E8), 'nube'),
  (Icons.home_rounded, Color(0xFF8E4EC6), 'casa'),
  (Icons.directions_car_rounded, Color(0xFFE5484D), 'carro'),
  (Icons.directions_bike_rounded, Color(0xFF30A46C), 'bicicleta'),
  (Icons.music_note_rounded, Color(0xFF8E4EC6), 'nota musical'),
  (Icons.umbrella_rounded, Color(0xFF3E7BFA), 'sombrilla'),
  (Icons.cake_rounded, Color(0xFFE93D82), 'pastel'),
  (Icons.local_cafe_rounded, Color(0xFF8D6346), 'taza'),
  (Icons.phone_rounded, Color(0xFF30A46C), 'teléfono'),
  (Icons.key_rounded, Color(0xFFF5B800), 'llave'),
  (Icons.anchor_rounded, Color(0xFF2559B8), 'ancla'),
  (Icons.eco_rounded, Color(0xFF30A46C), 'hoja'),
  (Icons.water_drop_rounded, Color(0xFF3E7BFA), 'gota'),
  (Icons.bolt_rounded, Color(0xFFF5B800), 'rayo'),
  (Icons.sailing_rounded, Color(0xFF12A594), 'velero'),
  (Icons.emoji_nature_rounded, Color(0xFFF76808), 'abeja'),
  (Icons.icecream_rounded, Color(0xFFE93D82), 'helado'),
  (Icons.flight_rounded, Color(0xFF5B5BD6), 'avión'),
];

enum _Phase { countdown, target, feedback }

/// Busca la imagen (velocidad): arriba aparece una figura y el paciente la
/// encuentra en una cuadrícula de [cuadricula] figuras. Un toque por ronda.
class FindImageGameScreen extends StatefulWidget {
  const FindImageGameScreen({
    super.key,
    required this.rondas,
    required this.cuadricula,
    required this.tiempoLimiteMs,
    this.random,
  });

  final int rondas;
  final int cuadricula;
  final int tiempoLimiteMs;
  final Random? random;

  @override
  State<FindImageGameScreen> createState() => _FindImageGameScreenState();
}

class _FindImageGameScreenState extends State<FindImageGameScreen> {
  late final Random _random = widget.random ?? Random();
  late final int _cells = widget.cuadricula.clamp(4, findFigures.length);
  final _stopwatch = Stopwatch();
  final List<int> _hits = [];
  Timer? _timer;

  _Phase _phase = _Phase.countdown;
  int _countdown = 3;
  int _round = 0;
  List<int> _grid = const [];
  int _target = 0;
  int? _tapped;
  late int _msLeft = widget.tiempoLimiteMs;

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
    final figures = List.generate(findFigures.length, (i) => i)..shuffle(_random);
    final grid = figures.take(_cells).toList();
    setState(() {
      _grid = grid;
      _target = grid[_random.nextInt(grid.length)];
      _tapped = null;
      _phase = _Phase.target;
      _msLeft = widget.tiempoLimiteMs;
    });
    _stopwatch
      ..reset()
      ..start();
    var ticks = 0;
    _timer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      ticks++;
      final left = widget.tiempoLimiteMs - ticks * 100;
      if (left <= 0) {
        _resolve(null);
      } else {
        setState(() => _msLeft = left);
      }
    });
  }

  void _resolve(int? figure) {
    if (_phase != _Phase.target) return;
    _timer?.cancel();
    _stopwatch.stop();
    if (figure == _target) _hits.add(_stopwatch.elapsedMilliseconds);
    setState(() {
      _tapped = figure;
      _phase = _Phase.feedback;
      _round++;
    });
    _timer = Timer(const Duration(milliseconds: 750), _next);
  }

  int get _columns => switch (_cells) {
        <= 4 => 2,
        <= 12 => 3,
        _ => 4,
      };

  @override
  Widget build(BuildContext context) {
    final target = findFigures[_target];
    return GameShell(
      progress: _round / widget.rondas,
      counter: '${min(_round + 1, widget.rondas)}/${widget.rondas}',
      title: _phase == _Phase.countdown ? 'Prepárate' : 'Encuentra esta figura',
      subtitle: _phase == _Phase.countdown ? 'Busca la figura lo más rápido que puedas.' : null,
      child: _phase == _Phase.countdown
          ? Center(
              child: Text('$_countdown',
                  style: TextStyle(
                      fontSize: 80, fontWeight: FontWeight.w900, color: AikoColors.violet)),
            )
          : Column(
              children: [
                Semantics(
                  liveRegion: true,
                  label: 'Busca: ${target.$3}',
                  excludeSemantics: true,
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: softCard(radius: 26, border: AikoColors.lilac),
                    child: Icon(target.$1, size: 64, color: target.$2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(40, 12, 40, 4),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: _phase == _Phase.target ? _msLeft / widget.tiempoLimiteMs : 0,
                      minHeight: 8,
                      backgroundColor: Colors.white,
                      color: _msLeft < widget.tiempoLimiteMs * 0.3
                          ? const Color(0xFFE07B39)
                          : AikoColors.violet,
                    ),
                  ),
                ),
                Expanded(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 440),
                      child: GridView.count(
                        shrinkWrap: true,
                        padding: const EdgeInsets.all(18),
                        crossAxisCount: _columns,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        children: [for (final f in _grid) _cell(f)],
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _cell(int figure) {
    final (icon, color, name) = findFigures[figure];
    final feedback = _phase == _Phase.feedback;
    final isTarget = figure == _target;
    Color? border;
    if (feedback && isTarget) border = AikoColors.success;
    if (feedback && figure == _tapped && !isTarget) border = const Color(0xFFD9534F);
    return Semantics(
      button: true,
      label: name,
      excludeSemantics: true,
      child: GestureDetector(
        onTapDown: _phase == _Phase.target ? (_) => _resolve(figure) : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: softCard(
            radius: 20,
            color: border == null ? Colors.white : border.withValues(alpha: 0.12),
            border: border,
          ),
          child: FittedBox(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Icon(icon, color: color),
            ),
          ),
        ),
      ),
    );
  }
}
