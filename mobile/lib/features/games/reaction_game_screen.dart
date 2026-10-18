import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme.dart';
import 'game_outcome.dart';

/// Velocidad de procesamiento: tocar el círculo apenas aparece.
///
/// Parámetros: `intentos` (5–30) y `tiempo_limite_ms` (300–3000).
/// Tocar antes de que aparezca cuenta como fallo; tocar fuera del círculo
/// no penaliza.
class ReactionGameScreen extends StatefulWidget {
  const ReactionGameScreen({
    super.key,
    required this.intentos,
    required this.tiempoLimiteMs,
    this.random,
  });

  final int intentos;
  final int tiempoLimiteMs;
  final Random? random;

  @override
  State<ReactionGameScreen> createState() => _ReactionGameScreenState();
}

enum _Phase { countdown, waiting, target, feedback }

class _ReactionGameScreenState extends State<ReactionGameScreen> {
  late final Random _random = widget.random ?? Random();
  final _stopwatch = Stopwatch();
  final List<int> _hits = [];
  Timer? _timer;

  _Phase _phase = _Phase.countdown;
  int _countdown = 3;
  int _trial = 0; // intentos ya jugados
  Alignment _targetAt = Alignment.center;
  String _feedback = '';
  bool _feedbackGood = true;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown <= 1) {
        timer.cancel();
        _nextTrial();
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

  void _nextTrial() {
    if (!mounted) return;
    if (_trial >= widget.intentos) {
      Navigator.of(context).pop(GameOutcome.fromReactions(
        intentos: widget.intentos,
        tiemposAciertoMs: _hits,
      ));
      return;
    }
    setState(() => _phase = _Phase.waiting);
    _timer = Timer(Duration(milliseconds: 1000 + _random.nextInt(2000)), () {
      if (!mounted) return;
      setState(() {
        _targetAt = Alignment(
          _random.nextDouble() * 1.4 - 0.7,
          _random.nextDouble() * 1.2 - 0.6,
        );
        _phase = _Phase.target;
      });
      // El tiempo empieza cuando el círculo ya está dibujado en pantalla.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _phase != _Phase.target) return;
        _stopwatch
          ..reset()
          ..start();
        _timer = Timer(Duration(milliseconds: widget.tiempoLimiteMs),
            () => _showFeedback('Se acabó el tiempo', good: false));
      });
    });
  }

  void _onTarget() {
    if (_phase != _Phase.target) return;
    final ms = _stopwatch.elapsedMilliseconds;
    _hits.add(ms);
    _showFeedback('¡Bien! $ms ms', good: true);
  }

  void _onBackground() {
    if (_phase == _Phase.waiting) {
      _showFeedback('Muy pronto. Espera al círculo.', good: false);
    }
  }

  void _showFeedback(String text, {required bool good}) {
    _timer?.cancel();
    _stopwatch.stop();
    setState(() {
      _phase = _Phase.feedback;
      _feedback = text;
      _feedbackGood = good;
      _trial++;
    });
    _timer = Timer(const Duration(milliseconds: 900), _nextTrial);
  }

  Future<void> _confirmExit() async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Salir del ejercicio?'),
        content: const Text('Este intento no se guardará.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Seguir jugando'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (leave == true && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmExit();
      },
      child: Scaffold(
        backgroundColor: AikoColors.lavenderBg,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          leading: IconButton(
            tooltip: 'Salir',
            icon: const Icon(Icons.close_rounded),
            onPressed: _confirmExit,
          ),
          title: _Progress(done: _trial, total: widget.intentos),
        ),
        body: SafeArea(
          // Listener (y no GestureDetector) para registrar el toque al
          // instante: el reconocedor de taps puede demorar ~100 ms.
          child: Listener(
            behavior: HitTestBehavior.opaque,
            onPointerDown: (_) => _onBackground(),
            child: Stack(
              children: [
                Align(
                  alignment: const Alignment(0, -0.92),
                  child: _Hint(phase: _phase),
                ),
                if (_phase == _Phase.countdown)
                  Center(
                    child: Text('$_countdown',
                        style: const TextStyle(
                            fontSize: 96,
                            fontWeight: FontWeight.w800,
                            color: AikoColors.violet)),
                  ),
                if (_phase == _Phase.target)
                  Align(
                    alignment: _targetAt,
                    child: Listener(
                      onPointerDown: (_) => _onTarget(),
                      child: Semantics(
                        button: true,
                        label: 'Círculo, tócalo',
                        child: Container(
                          key: const ValueKey('reaction-target'),
                          height: 110,
                          width: 110,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: AikoColors.heroGradient,
                            boxShadow: [
                              BoxShadow(
                                color: AikoColors.violet.withValues(alpha: 0.3),
                                blurRadius: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                if (_phase == _Phase.feedback)
                  Center(
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        _feedback,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: _feedbackGood
                              ? AikoColors.success
                              : const Color(0xFFB4582B),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Hint extends StatelessWidget {
  const _Hint({required this.phase});

  final _Phase phase;

  @override
  Widget build(BuildContext context) {
    final text = switch (phase) {
      _Phase.countdown => 'Prepárate…',
      _Phase.waiting => 'Espera al círculo…',
      _Phase.target => '¡Tócalo!',
      _Phase.feedback => '',
    };
    return Text(text,
        style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AikoColors.inkSoft));
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.done, required this.total});

  final int done;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Intento ${min(done + 1, total)} de $total',
      excludeSemantics: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: LinearProgressIndicator(
          value: total == 0 ? 0 : done / total,
          minHeight: 12,
          backgroundColor: AikoColors.lilacSoft,
          color: AikoColors.violet,
        ),
      ),
    );
  }
}
