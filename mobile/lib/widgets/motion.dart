import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

/// ¿Hay que evitar animaciones? (ajuste del sistema o de AiKO).
bool reduceMotion(BuildContext context) =>
    MediaQuery.maybeDisableAnimationsOf(context) ?? false;

/// Aparece con fundido y desplazamiento, con un retraso opcional para
/// encadenar elementos (entrada escalonada).
class FadeSlideIn extends StatefulWidget {
  const FadeSlideIn({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.offset = const Offset(0, 24),
    this.duration = const Duration(milliseconds: 420),
  });

  final Widget child;
  final Duration delay;
  final Offset offset;
  final Duration duration;

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: widget.duration);
  late final Animation<double> _curve =
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
  Timer? _timer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_controller.isAnimating || _controller.isCompleted || _timer != null) {
      return;
    }
    if (reduceMotion(context)) {
      _controller.value = 1;
    } else if (widget.delay == Duration.zero) {
      _controller.forward();
    } else {
      _timer = Timer(widget.delay, () {
        if (mounted) _controller.forward();
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _curve,
      child: widget.child,
      builder: (context, child) => Opacity(
        opacity: _curve.value,
        child: Transform.translate(
          offset: widget.offset * (1 - _curve.value),
          child: child,
        ),
      ),
    );
  }
}

/// Se hunde al presionar, como un botón físico.
class Pressable extends StatefulWidget {
  const Pressable({
    super.key,
    required this.child,
    required this.onTap,
    this.depth = 5,
  });

  final Widget child;
  final VoidCallback? onTap;

  /// Píxeles que baja al presionar.
  final double depth;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  void _set(bool value) {
    if (_down != value) setState(() => _down = value);
  }

  @override
  Widget build(BuildContext context) {
    final still = reduceMotion(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: widget.onTap == null ? null : (_) => _set(true),
      onTapUp: (_) => _set(false),
      onTapCancel: () => _set(false),
      onTap: widget.onTap,
      child: AnimatedSlide(
        duration: const Duration(milliseconds: 90),
        offset: Offset(0, _down && !still ? widget.depth / 100 : 0),
        child: AnimatedScale(
          duration: const Duration(milliseconds: 90),
          scale: _down && !still ? 0.96 : 1,
          child: widget.child,
        ),
      ),
    );
  }
}

/// Repite una animación suave de ida y vuelta (flotar, latir).
class Breathing extends StatefulWidget {
  const Breathing({
    super.key,
    required this.builder,
    this.period = const Duration(milliseconds: 1600),
    this.child,
  });

  /// Recibe un valor 0→1→0 (onda senoidal).
  final Widget Function(BuildContext context, double t, Widget? child) builder;
  final Duration period;
  final Widget? child;

  @override
  State<Breathing> createState() => _BreathingState();
}

class _BreathingState extends State<Breathing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: widget.period);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reduceMotion(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      child: widget.child,
      builder: (context, child) => widget.builder(
        context,
        (1 - cos(_controller.value * 2 * pi)) / 2,
        child,
      ),
    );
  }
}

/// Número que cuenta hasta su valor (XP, nivel, porcentajes).
class CountUp extends StatelessWidget {
  const CountUp({super.key, required this.value, this.style, this.suffix = ''});

  final int value;
  final TextStyle? style;
  final String suffix;

  @override
  Widget build(BuildContext context) {
    if (reduceMotion(context)) return Text('$value$suffix', style: style);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.toDouble()),
      duration: const Duration(milliseconds: 900),
      curve: Curves.easeOutCubic,
      builder: (context, v, _) => Text('${v.round()}$suffix', style: style),
    );
  }
}
