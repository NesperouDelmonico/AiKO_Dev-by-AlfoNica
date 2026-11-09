import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/brand_image.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import 'login_screen.dart';

/// Frases de la bienvenida; cambia una por día.
const welcomePhrases = [
  'Entrena tu mente,\nun paso a la vez.',
  'Cada pequeño ejercicio\nsuma a tu bienestar.',
  'Hoy es un buen día\npara volver a intentarlo.',
  'Tu ritmo es el\nritmo correcto.',
  'La constancia\nhace la diferencia.',
];

String phraseOfTheDay([DateTime? now]) {
  final day = now ?? DateTime.now();
  final index = DateTime(day.year, day.month, day.day)
          .difference(DateTime(2026))
          .inDays %
      welcomePhrases.length;
  return welcomePhrases[index.abs()];
}

/// Arranque → **Bienvenida** → Inicio de sesión.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  void _openLogin(BuildContext context) {
    Navigator.of(context).push(
      PageRouteBuilder<void>(
        transitionDuration: const Duration(milliseconds: 420),
        reverseTransitionDuration: const Duration(milliseconds: 320),
        pageBuilder: (_, __, ___) => const LoginScreen(),
        transitionsBuilder: (_, animation, __, child) {
          final curve =
              CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
          return FadeTransition(
            opacity: curve,
            child: SlideTransition(
              position: Tween(begin: const Offset(0, 0.06), end: Offset.zero)
                  .animate(curve),
              child: child,
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final notice = context.select<Session, String?>((s) => s.notice);
    final size = MediaQuery.sizeOf(context);
    final bearSize = min(size.width * 0.62, size.height * 0.34);
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFF3EEFF), Color(0xFFEDE4FF), Color(0xFFFFF7EC)],
          ),
        ),
        child: Stack(
          children: [
            // Paisaje de playa en la parte baja.
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: size.height * 0.36,
              child: BrandImage(
                'welcome_landscape',
                fit: BoxFit.cover,
                alignment: Alignment.bottomCenter,
                fallback: const CustomPaint(
                  size: Size.infinite,
                  painter: WelcomeLandscapePainter(),
                ),
              ),
            ),
            ..._sparkles(size),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
                child: Column(
                  children: [
                    const Spacer(flex: 2),
                    const FadeSlideIn(
                      offset: Offset(0, -18),
                      child: _Wordmark(),
                    ),
                    const SizedBox(height: 10),
                    FadeSlideIn(
                      delay: const Duration(milliseconds: 160),
                      child: Text(
                        phraseOfTheDay(),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 20,
                          height: 1.3,
                          fontWeight: FontWeight.w800,
                          color: AikoColors.ink,
                        ),
                      ),
                    ),
                    const Spacer(),
                    FadeSlideIn(
                      delay: const Duration(milliseconds: 300),
                      offset: const Offset(0, 30),
                      child: Breathing(
                        period: const Duration(milliseconds: 3200),
                        builder: (context, t, child) => Transform.translate(
                          offset: Offset(0, -6 * t),
                          child: child,
                        ),
                        child: BrandImage(
                          'bear_welcome_backpack',
                          width: bearSize,
                          height: bearSize,
                          semanticLabel: 'AiKO, listo para el viaje',
                          fallback: AikoMascot(
                            size: bearSize * 0.7,
                            animate: false,
                          ),
                        ),
                      ),
                    ),
                    const Spacer(flex: 3),
                    if (notice != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _Notice(text: notice),
                      ),
                    FadeSlideIn(
                      delay: const Duration(milliseconds: 450),
                      child: FilledButton(
                        onPressed: () => _openLogin(context),
                        child: const Text('Iniciar sesión'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Tu especialista te entrega tu cuenta.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AikoColors.violetDeep,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _sparkles(Size size) => [
        for (final (dx, dy, s) in const [
          (0.12, 0.10, 22.0),
          (0.84, 0.16, 16.0),
          (0.90, 0.40, 22.0),
          (0.08, 0.46, 14.0),
        ])
          Positioned(
            left: size.width * dx,
            top: size.height * dy,
            child: ExcludeSemantics(
              child: Breathing(
                period: Duration(milliseconds: 1800 + (s * 60).round()),
                builder: (context, t, child) => Opacity(
                  opacity: 0.55 + 0.45 * t,
                  child: Transform.scale(scale: 0.85 + 0.2 * t, child: child),
                ),
                child: SparkleStar(size: s),
              ),
            ),
          ),
      ];
}

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      label: 'AiKO',
      child: ExcludeSemantics(
        child: ShaderMask(
          shaderCallback: (rect) => const LinearGradient(
            colors: [AikoColors.violetBright, AikoColors.violetDeep],
          ).createShader(rect),
          child: const Text(
            'AiKO',
            style: TextStyle(
              fontSize: 64,
              height: 1,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: -1,
            ),
          ),
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(text,
            textAlign: TextAlign.center,
            style: const TextStyle(
                color: AikoColors.violet, fontWeight: FontWeight.w700)),
      );
}

/// Playa suave dibujada en código (reemplazo de welcome_landscape.png).
class WelcomeLandscapePainter extends CustomPainter {
  const WelcomeLandscapePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    // Montañas lavanda al fondo.
    final hills = Path()
      ..moveTo(0, h * 0.42)
      ..quadraticBezierTo(w * 0.18, h * 0.10, w * 0.38, h * 0.36)
      ..quadraticBezierTo(w * 0.55, h * 0.05, w * 0.76, h * 0.32)
      ..quadraticBezierTo(w * 0.9, h * 0.18, w, h * 0.30)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(hills, Paint()..color = const Color(0xFFD9CCFA));
    // Agua.
    final water = Path()
      ..moveTo(0, h * 0.5)
      ..quadraticBezierTo(w * 0.5, h * 0.42, w, h * 0.5)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(water, Paint()..color = const Color(0xFF9FE0EA));
    final wave = Paint()
      ..color = Colors.white.withValues(alpha: 0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    for (final (x, y) in const [(0.62, 0.6), (0.8, 0.68), (0.7, 0.78)]) {
      canvas.drawArc(Rect.fromCenter(center: Offset(w * x, h * y), width: 34, height: 10),
          pi, pi, false, wave);
    }
    // Arena.
    final sand = Path()
      ..moveTo(0, h * 0.62)
      ..quadraticBezierTo(w * 0.32, h * 0.58, w * 0.5, h * 0.78)
      ..quadraticBezierTo(w * 0.62, h * 0.92, w * 0.58, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(sand, Paint()..color = const Color(0xFFF6E7C8));
    // Arbustos redondos.
    final bush = Paint()..color = const Color(0xFF8FD9B6);
    final bushDark = Paint()..color = const Color(0xFF6CC79E);
    for (final (x, y, r) in const [
      (0.08, 0.6, 26.0),
      (0.17, 0.57, 20.0),
      (0.27, 0.62, 16.0),
    ]) {
      canvas.drawCircle(Offset(w * x, h * y + 4), r, bushDark);
      canvas.drawCircle(Offset(w * x, h * y), r, bush);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
