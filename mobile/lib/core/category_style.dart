import 'package:flutter/material.dart';

import 'theme.dart';

/// Color e ícono por categoría cognitiva (Atención, Memoria, Velocidad).
class CategoryStyle {
  const CategoryStyle(this.background, this.foreground, this.icon);

  final Color background;
  final Color foreground;
  final IconData icon;

  static const _attention =
      CategoryStyle(AikoColors.lilacSoft, AikoColors.violet, Icons.visibility_rounded);
  static const _memory =
      CategoryStyle(AikoColors.peachSoft, Color(0xFFB4582B), Icons.grid_view_rounded);
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
