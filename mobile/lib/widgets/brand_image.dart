import 'package:flutter/material.dart';

/// Ilustración de `assets/brand/ia/<name>.png` (ver docs/imagenes-ia.md).
/// Mientras el PNG no exista se muestra [fallback], así la app funciona
/// antes de tener todas las imágenes.
class BrandImage extends StatelessWidget {
  const BrandImage(
    this.name, {
    super.key,
    required this.fallback,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.semanticLabel,
    this.alignment = Alignment.center,
  });

  final String name;
  final Widget fallback;
  final double? width;
  final double? height;
  final BoxFit fit;
  final String? semanticLabel;
  final Alignment alignment;

  static String path(String name) => 'assets/brand/ia/$name.png';

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      path(name),
      width: width,
      height: height,
      fit: fit,
      alignment: alignment,
      semanticLabel: semanticLabel,
      excludeFromSemantics: semanticLabel == null,
      gaplessPlayback: true,
      errorBuilder: (_, __, ___) =>
          SizedBox(width: width, height: height, child: Center(child: fallback)),
    );
  }
}
