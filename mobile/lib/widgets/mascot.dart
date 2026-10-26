import 'dart:async';

import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'motion.dart';

/// Osito-globo de AiKO dibujado a partir del logo (assets/brand/mascot.svg).
/// Se dibuja en código para poder parpadear y flotar.
class AikoMascot extends StatefulWidget {
  const AikoMascot({
    super.key,
    this.size = 96,
    this.color = AikoColors.violetBright,
    this.earColor = AikoColors.lilac,
    this.animate = true,
    this.happy = false,
  });

  final double size;
  final Color color;
  final Color earColor;

  /// Flota y parpadea (se desactiva con "reducir animaciones").
  final bool animate;

  /// Sonrisa más amplia (celebraciones).
  final bool happy;

  @override
  State<AikoMascot> createState() => _AikoMascotState();
}

class _AikoMascotState extends State<AikoMascot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _blink = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 180),
  );
  Timer? _timer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _timer?.cancel();
    if (widget.animate && !reduceMotion(context)) {
      _timer = Timer.periodic(const Duration(milliseconds: 3400), (_) {
        if (mounted) _blink.forward().then((_) => _blink.reverse());
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _blink.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final drawing = AnimatedBuilder(
      animation: _blink,
      builder: (context, _) => CustomPaint(
        size: Size(widget.size, widget.size * 80 / 68),
        painter: MascotPainter(
          color: widget.color,
          earColor: widget.earColor,
          blink: _blink.value,
          happy: widget.happy,
        ),
      ),
    );
    return Semantics(
      label: 'AiKO, tu compañero',
      image: true,
      child: !widget.animate
          ? drawing
          : Breathing(
              period: const Duration(milliseconds: 2400),
              child: drawing,
              builder: (context, t, child) => Transform.translate(
                offset: Offset(0, -widget.size * 0.05 * t),
                child: child,
              ),
            ),
    );
  }
}

class MascotPainter extends CustomPainter {
  MascotPainter({
    required this.color,
    required this.earColor,
    this.blink = 0,
    this.happy = false,
  });

  final Color color;
  final Color earColor;

  /// 0 = ojos abiertos, 1 = cerrados.
  final double blink;
  final bool happy;

  static const _muzzle = Color(0xFFE9E1FF);

  @override
  void paint(Canvas canvas, Size size) {
    // Coordenadas del SVG: x en [-34, 34], y en [-36, 44].
    final scale = size.width / 68;
    canvas
      ..save()
      ..scale(scale)
      ..translate(34, 36);
    final body = Paint()..color = color;
    final ink = Paint()..color = AikoColors.ink;

    for (final x in [-21.0, 21.0]) {
      canvas
        ..drawCircle(Offset(x, -23), 10, body)
        ..drawCircle(Offset(x, -23), 5, Paint()..color = earColor);
    }
    canvas
      ..drawPath(
        Path()
          ..moveTo(-20, 22)
          ..lineTo(-26, 42)
          ..lineTo(-2, 29)
          ..close(),
        body,
      )
      ..drawCircle(Offset.zero, 30, body)
      ..drawOval(Rect.fromCenter(center: const Offset(0, 9), width: 22, height: 16),
          Paint()..color = _muzzle)
      ..drawOval(Rect.fromCenter(center: const Offset(0, 5), width: 7, height: 5), ink);

    // Ojos (se aplanan al parpadear).
    final eyeHeight = 6 * (1 - blink * 0.9);
    for (final x in [-12.0, 12.0]) {
      canvas.drawOval(
          Rect.fromCenter(center: Offset(x, -6), width: 6, height: eyeHeight), ink);
    }

    // Sonrisa.
    canvas.drawPath(
      Path()
        ..moveTo(happy ? -6 : -5, 11)
        ..quadraticBezierTo(0, happy ? 18 : 15, happy ? 6 : 5, 11),
      Paint()
        ..color = AikoColors.ink
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round,
    );

    final cheek = Paint()..color = AikoColors.star;
    canvas
      ..drawCircle(const Offset(-22, 5), 3.5, cheek)
      ..drawCircle(const Offset(22, 5), 3.5, cheek)
      ..restore();
  }

  @override
  bool shouldRepaint(MascotPainter old) =>
      old.blink != blink || old.color != color || old.happy != happy;
}

/// Estrella de cuatro puntas del logo.
class SparkleStar extends StatelessWidget {
  const SparkleStar({super.key, this.size = 20, this.color = AikoColors.star});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => CustomPaint(
        size: Size.square(size),
        painter: _StarPainter(color),
      );
}

class _StarPainter extends CustomPainter {
  _StarPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width / 2;
    final c = Offset(r, r);
    final path = Path()
      ..moveTo(c.dx, c.dy - r)
      ..quadraticBezierTo(c.dx, c.dy, c.dx + r, c.dy)
      ..quadraticBezierTo(c.dx, c.dy, c.dx, c.dy + r)
      ..quadraticBezierTo(c.dx, c.dy, c.dx - r, c.dy)
      ..quadraticBezierTo(c.dx, c.dy, c.dx, c.dy - r)
      ..close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_StarPainter old) => old.color != color;
}

/// Logo completo: mascota + "AiKO" con la estrella sobre la i.
class AikoLogo extends StatelessWidget {
  const AikoLogo({super.key, this.mascotSize = 110, this.animate = true});

  final double mascotSize;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final letters = mascotSize * 0.5;
    return Semantics(
      label: 'AiKO',
      excludeSemantics: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AikoMascot(size: mascotSize, animate: animate),
          SizedBox(height: mascotSize * 0.12),
          Stack(
            clipBehavior: Clip.none,
            children: [
              Text(
                'AiKO',
                style: TextStyle(
                  fontSize: letters,
                  height: 1,
                  fontWeight: FontWeight.w900,
                  letterSpacing: letters * 0.06,
                  color: AikoColors.violetDeep,
                ),
              ),
              Positioned(
                // Sobre la "i" (segunda letra).
                left: letters * 0.62,
                top: -letters * 0.32,
                child: SparkleStar(size: letters * 0.42),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Globo de diálogo de la mascota.
class SpeechBubble extends StatelessWidget {
  const SpeechBubble({super.key, required this.text, this.tailLeft = true});

  final String text;
  final bool tailLeft;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 160),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(tailLeft ? 4 : 16),
          bottomRight: Radius.circular(tailLeft ? 16 : 4),
        ),
        border: Border.all(color: AikoColors.lilacSoft, width: 2),
        boxShadow: [
          BoxShadow(
            color: AikoColors.violet.withValues(alpha: 0.12),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Text(text,
          style: const TextStyle(
              fontSize: 14, fontWeight: FontWeight.w800, color: AikoColors.violetDeep)),
    );
  }
}
