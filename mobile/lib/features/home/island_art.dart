import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/island_theme.dart';
import '../../widgets/brand_image.dart';

/// Ilustración de una isla: el PNG generado (island_<tema>.png) o, mientras
/// no exista, una isla pintada en código con el ícono del tema.
class IslandArt extends StatelessWidget {
  const IslandArt({
    super.key,
    required this.theme,
    required this.size,
    this.locked = false,
  });

  final IslandTheme theme;
  final double size;
  final bool locked;

  @override
  Widget build(BuildContext context) {
    final art = BrandImage(
      theme.islandImage,
      width: size,
      height: size,
      fallback: CustomPaint(
        size: Size.square(size),
        painter: IslandPainter(theme: theme),
      ),
    );
    if (!locked) return art;
    // Bloqueada: desaturada y más clara, sin perder la forma.
    return ColorFiltered(
      colorFilter: const ColorFilter.matrix([
        0.33, 0.33, 0.33, 0, 40, //
        0.31, 0.31, 0.31, 0, 40, //
        0.36, 0.36, 0.36, 0, 52, //
        0, 0, 0, 0.85, 0,
      ]),
      child: art,
    );
  }
}

/// Isla flotante en ¾: halo de agua clara, arena, pasto y el ícono del
/// tema sobre un "monumento" redondo.
class IslandPainter extends CustomPainter {
  IslandPainter({required this.theme});

  final IslandTheme theme;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final c = Offset(w / 2, h * 0.6);
    // Agua clara alrededor.
    canvas.drawOval(
      Rect.fromCenter(center: c.translate(0, h * 0.05), width: w * 0.98, height: h * 0.46),
      Paint()..color = Colors.white.withValues(alpha: 0.45),
    );
    // Sombra bajo la isla.
    canvas.drawOval(
      Rect.fromCenter(center: c.translate(0, h * 0.07), width: w * 0.8, height: h * 0.3),
      Paint()..color = const Color(0xFF5BB8C4).withValues(alpha: 0.35),
    );
    // Arena.
    canvas.drawOval(
      Rect.fromCenter(center: c.translate(0, h * 0.03), width: w * 0.82, height: h * 0.32),
      Paint()..color = const Color(0xFFF6E7C8),
    );
    // Pasto (borde y cara superior).
    canvas.drawOval(
      Rect.fromCenter(center: c.translate(0, -h * 0.005), width: w * 0.7, height: h * 0.25),
      Paint()..color = const Color(0xFF6CC79E),
    );
    canvas.drawOval(
      Rect.fromCenter(center: c.translate(0, -h * 0.025), width: w * 0.68, height: h * 0.22),
      Paint()..color = const Color(0xFF8FD9B6),
    );
    // Arbustos.
    final bush = Paint()..color = const Color(0xFF5FBF92);
    for (final (dx, dy, r) in const [(-0.26, -0.02, 0.06), (0.25, 0.0, 0.05), (0.18, -0.07, 0.04)]) {
      canvas.drawCircle(c.translate(w * dx, h * dy), w * r, bush);
    }
    // Monumento del tema.
    final base = c.translate(0, -h * 0.17);
    final r = w * 0.17;
    canvas.drawCircle(base.translate(0, r * 0.18), r, Paint()..color = theme.deep.withValues(alpha: 0.9));
    canvas.drawCircle(
      base,
      r,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.35, -0.45),
          colors: [Color.lerp(theme.color, Colors.white, 0.3)!, theme.color],
        ).createShader(Rect.fromCircle(center: base, radius: r)),
    );
    final icon = theme.icon;
    final text = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(icon.codePoint),
        style: TextStyle(
          fontSize: r * 1.15,
          fontFamily: icon.fontFamily,
          package: icon.fontPackage,
          color: Colors.white,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    text.paint(canvas, base - Offset(text.width / 2, text.height / 2));
  }

  @override
  bool shouldRepaint(IslandPainter old) => old.theme != theme;
}

/// Mar suave: degradado turquesa-lavanda con ondas, o el mosaico
/// sea_tile.png si existe.
class SeaBackground extends StatelessWidget {
  const SeaBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFFDDF3F6), Color(0xFFC9EDF1), Color(0xFFE6E0FA)],
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: Image.asset(
            BrandImage.path('sea_tile'),
            repeat: ImageRepeat.repeat,
            scale: 2.5,
            excludeFromSemantics: true,
            errorBuilder: (_, __, ___) =>
                const CustomPaint(painter: _WavesPainter()),
          ),
        ),
        child,
      ],
    );
  }
}

class _WavesPainter extends CustomPainter {
  const _WavesPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    final random = Random(7);
    for (var y = 30.0; y < size.height; y += 70) {
      for (var i = 0; i < 3; i++) {
        final x = random.nextDouble() * size.width;
        final rect = Rect.fromCenter(center: Offset(x, y + random.nextDouble() * 40), width: 28, height: 8);
        canvas.drawArc(rect, pi, pi, false, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
