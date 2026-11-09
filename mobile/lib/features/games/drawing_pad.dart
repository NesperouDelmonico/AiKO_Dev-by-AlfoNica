import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../core/theme.dart';
import 'game_shell.dart';

class _Stroke {
  _Stroke(this.color, this.width);
  final Color color;
  final double width;
  final List<Offset> points = [];
}

/// Micro paint: el paciente dibuja con el dedo lo que recuerda. Devuelve
/// el dibujo en PNG (fondo blanco) o null si lo omite.
class DrawingScreen extends StatefulWidget {
  const DrawingScreen({super.key, this.prompt = 'Dibuja lo que recuerdes'});

  final String prompt;

  @override
  State<DrawingScreen> createState() => _DrawingScreenState();
}

class _DrawingScreenState extends State<DrawingScreen> {
  // El lienzo siempre es blanco: los colores no cambian de noche.
  static const _colors = [
    Color(0xFF2B2340),
    Color(0xFFD9534F),
    Color(0xFFE9A23B),
    AikoColors.success,
    AikoColors.sky,
    AikoColors.brand,
  ];
  final _boundary = GlobalKey();
  final List<_Stroke> _strokes = [];
  Color _color = _colors.first;
  double _width = 6;
  bool _saving = false;

  Future<void> _save() async {
    if (_strokes.isEmpty) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _saving = true);
    Uint8List? png;
    try {
      final render = _boundary.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final image = await render.toImage(pixelRatio: 1.5);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      png = data?.buffer.asUint8List();
    } catch (_) {
      png = null;
    }
    if (mounted) Navigator.of(context).pop(png);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: DecoratedBox(
        decoration: gameBackground,
        child: SafeArea(
          child: Column(
            children: [
              GameHeading(
                title: widget.prompt,
                subtitle: 'Tu especialista verá tu dibujo. No tiene que ser perfecto.',
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    decoration: softCard(radius: 24),
                    clipBehavior: Clip.antiAlias,
                    child: RepaintBoundary(
                      key: _boundary,
                      child: GestureDetector(
                        onPanStart: (d) => setState(() =>
                            _strokes.add(_Stroke(_color, _width)..points.add(d.localPosition))),
                        onPanUpdate: (d) =>
                            setState(() => _strokes.last.points.add(d.localPosition)),
                        child: Semantics(
                          label: 'Lienzo para dibujar',
                          child: CustomPaint(
                            painter: _Painter(_strokes),
                            size: Size.infinite,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Row(
                  children: [
                    for (final color in _colors)
                      Expanded(
                        child: Semantics(
                          button: true,
                          selected: color == _color,
                          label: 'Color',
                          child: GestureDetector(
                            onTap: () => setState(() => _color = color),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              height: 40,
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                                border: Border.all(
                                    color: color == _color ? AikoColors.ink : Colors.white,
                                    width: color == _color ? 4 : 2),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton(
                      tooltip: 'Trazo fino',
                      isSelected: _width == 4,
                      onPressed: () => setState(() => _width = 4),
                      icon: const Icon(Icons.edit_rounded, size: 20),
                    ),
                    IconButton(
                      tooltip: 'Trazo grueso',
                      isSelected: _width == 12,
                      onPressed: () => setState(() => _width = 12),
                      icon: const Icon(Icons.brush_rounded, size: 30),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      tooltip: 'Deshacer',
                      onPressed: _strokes.isEmpty ? null : () => setState(() => _strokes.removeLast()),
                      icon: const Icon(Icons.undo_rounded),
                    ),
                    IconButton(
                      tooltip: 'Borrar todo',
                      onPressed: _strokes.isEmpty ? null : () => setState(_strokes.clear),
                      icon: const Icon(Icons.delete_outline_rounded),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                child: Row(
                  children: [
                    TextButton(
                      onPressed: _saving ? null : () => Navigator.of(context).pop(),
                      child: const Text('Omitir'),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: _saving ? null : _save,
                        child: Text(_saving ? 'GUARDANDO…' : 'LISTO'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Painter extends CustomPainter {
  _Painter(this.strokes);
  final List<_Stroke> strokes;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = Colors.white);
    for (final stroke in strokes) {
      final paint = Paint()
        ..color = stroke.color
        ..strokeWidth = stroke.width
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;
      if (stroke.points.length == 1) {
        canvas.drawCircle(stroke.points.first, stroke.width / 2, paint..style = PaintingStyle.fill);
        continue;
      }
      final path = Path()..moveTo(stroke.points.first.dx, stroke.points.first.dy);
      for (final point in stroke.points.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _Painter oldDelegate) => true;
}
