import 'package:flutter/material.dart';

import '../core/app_settings.dart';

const _ink = Color(0xFF2B2340);

Paint _fill(Color color) => Paint()..color = color;

Paint _stroke(Color color, double width) => Paint()
  ..color = color
  ..style = PaintingStyle.stroke
  ..strokeWidth = width
  ..strokeCap = StrokeCap.round
  ..strokeJoin = StrokeJoin.round;

/// Dibuja el accesorio sobre el osito, en las coordenadas del logo
/// (cabeza de radio 30 centrada en el origen). Es el mismo dibujo que usa el
/// panel web (`AikoBear.tsx`), para que el especialista vea lo mismo.
void paintAccessory(Canvas canvas, AikoAccessory accessory) {
  switch (accessory) {
    case AikoAccessory.base:
      return;
    case AikoAccessory.gorra:
      canvas
        ..drawPath(
          Path()
            ..moveTo(-21, -15)
            ..quadraticBezierTo(-22, -38, 0, -38)
            ..quadraticBezierTo(22, -38, 21, -15)
            ..close(),
          _fill(const Color(0xFFE5484D)),
        )
        ..drawPath(
          Path()
            ..moveTo(9, -16)
            ..quadraticBezierTo(32, -19, 41, -12)
            ..quadraticBezierTo(31, -8, 9, -11)
            ..close(),
          _fill(const Color(0xFFC33238)),
        )
        ..drawPath(
          Path()
            ..moveTo(-21, -15)
            ..quadraticBezierTo(0, -20, 21, -15),
          _stroke(const Color(0xFFC33238), 2),
        )
        ..drawCircle(const Offset(0, -38), 2.4, _fill(const Color(0xFFC33238)));
    case AikoAccessory.gafas:
      final lens = _fill(Colors.white.withValues(alpha: 0.3));
      final frame = _stroke(_ink, 2.2);
      for (final x in [-12.0, 12.0]) {
        canvas
          ..drawCircle(Offset(x, -6), 7.5, lens)
          ..drawCircle(Offset(x, -6), 7.5, frame);
      }
      canvas
        ..drawPath(
          Path()
            ..moveTo(-4.5, -6.5)
            ..quadraticBezierTo(0, -9, 4.5, -6.5),
          frame,
        )
        ..drawLine(const Offset(-19.5, -7), const Offset(-28, -10), frame)
        ..drawLine(const Offset(19.5, -7), const Offset(28, -10), frame);
    case AikoAccessory.audifonos:
      canvas.drawPath(
        Path()
          ..moveTo(-29, -3)
          ..quadraticBezierTo(-31, -43, 0, -43)
          ..quadraticBezierTo(31, -43, 29, -3),
        _stroke(_ink, 4),
      );
      for (final x in [-36.0, 25.0]) {
        canvas
          ..drawRRect(
            RRect.fromRectAndRadius(Rect.fromLTWH(x, -11, 11, 19), const Radius.circular(5)),
            _fill(const Color(0xFF3E7BFA)),
          )
          ..drawRRect(
            RRect.fromRectAndRadius(
                Rect.fromLTWH(x + 3.5, -7, 4, 11), const Radius.circular(2)),
            _fill(const Color(0xFF8FB8FF)),
          );
      }
    case AikoAccessory.mono:
      canvas
        ..save()
        ..translate(-15, -31)
        ..rotate(-0.314)
        ..drawPath(
          Path()
            ..moveTo(0, 0)
            ..lineTo(-13, -8)
            ..lineTo(-13, 8)
            ..close(),
          _fill(const Color(0xFFE93D82)),
        )
        ..drawPath(
          Path()
            ..moveTo(0, 0)
            ..lineTo(13, -8)
            ..lineTo(13, 8)
            ..close(),
          _fill(const Color(0xFFE93D82)),
        )
        ..drawCircle(Offset.zero, 4, _fill(const Color(0xFFC2185B)))
        ..restore();
    case AikoAccessory.gorro:
      canvas
        ..drawPath(
          Path()
            ..moveTo(-27, -12)
            ..quadraticBezierTo(-28, -42, 0, -42)
            ..quadraticBezierTo(28, -42, 27, -12)
            ..close(),
          _fill(const Color(0xFF12A594)),
        )
        ..drawPath(
          Path()
            ..moveTo(-18, -36)
            ..quadraticBezierTo(0, -44, 18, -36)
            ..moveTo(-24, -26)
            ..quadraticBezierTo(0, -34, 24, -26),
          _stroke(const Color(0xFF0D7F72), 2),
        )
        ..drawRRect(
          RRect.fromRectAndRadius(
              const Rect.fromLTWH(-29, -17, 58, 9), const Radius.circular(4.5)),
          _fill(const Color(0xFF0D7F72)),
        )
        ..drawCircle(const Offset(0, -44), 6, _fill(const Color(0xFFFFF7E6)));
    case AikoAccessory.bufanda:
      canvas
        ..drawPath(
          Path()
            ..moveTo(-23, 20)
            ..quadraticBezierTo(0, 33, 23, 20)
            ..lineTo(25, 28)
            ..quadraticBezierTo(0, 41, -25, 28)
            ..close(),
          _fill(const Color(0xFFE5484D)),
        )
        ..drawPath(
          Path()
            ..moveTo(8, 29)
            ..lineTo(19, 29)
            ..lineTo(21, 47)
            ..lineTo(10, 47)
            ..close(),
          _fill(const Color(0xFFC33238)),
        )
        ..drawPath(
          Path()
            ..moveTo(-14, 26.5)
            ..quadraticBezierTo(0, 32, 14, 26.5),
          _stroke(const Color(0xFFFFD23F), 2),
        );
    case AikoAccessory.corona:
      final crown = Path()
        ..moveTo(-17, -25)
        ..lineTo(-18, -41)
        ..lineTo(-9, -32)
        ..lineTo(0, -45)
        ..lineTo(9, -32)
        ..lineTo(18, -41)
        ..lineTo(17, -25)
        ..close();
      canvas
        ..drawPath(crown, _fill(const Color(0xFFFFD23F)))
        ..drawPath(crown, _stroke(const Color(0xFFE0A800), 1.6))
        ..drawCircle(const Offset(0, -31), 2.6, _fill(const Color(0xFFE5484D)))
        ..drawCircle(const Offset(-10, -28.5), 1.8, _fill(const Color(0xFF3E7BFA)))
        ..drawCircle(const Offset(10, -28.5), 1.8, _fill(const Color(0xFF30A46C)));
  }
}
