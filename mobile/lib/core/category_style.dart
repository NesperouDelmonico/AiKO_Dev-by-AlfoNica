import 'package:flutter/material.dart';

import 'theme.dart';

/// Color e ícono por categoría cognitiva (Atención, Memoria, Velocidad).
class CategoryStyle {
  const CategoryStyle(this._background, this._foreground, this.icon);

  final Color _background;
  final Color _foreground;
  final IconData icon;

  Color get background => AikoColors.tint(_foreground, _background);
  Color get foreground => AikoColors.deep(_foreground, _foreground);

  static const _attention =
      CategoryStyle(Color(0xFFE9E1FF), AikoColors.brand, Icons.visibility_rounded);
  static const _memory =
      CategoryStyle(Color(0xFFFFE8DB), Color(0xFFB4582B), Icons.grid_view_rounded);
  static const _speed =
      CategoryStyle(Color(0xFFDDF3EA), Color(0xFF2F7D5F), Icons.bolt_rounded);

  static CategoryStyle of(String categoria) {
    switch (categoria) {
      case 'Atención':
        return _attention;
      case 'Memoria':
        return _memory;
      case 'Velocidad':
        return _speed;
    }
    return _attention;
  }
}
