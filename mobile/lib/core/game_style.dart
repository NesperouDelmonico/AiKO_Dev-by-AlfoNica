import 'package:flutter/material.dart';

import 'models.dart';
import 'theme.dart';

/// Ícono, nombre y explicación breve de cada mini-juego.
class GameStyle {
  const GameStyle(this.icon, this.label, this.howTo, this.color);

  final IconData icon;
  final String label;
  final String howTo;
  final Color color;

  static const _styles = {
    Exercise.reaction: GameStyle(
      Icons.bolt_rounded,
      'Reacción rápida',
      'Mira la pantalla y toca el círculo apenas aparezca. Si tocas antes, ese intento no cuenta.',
      AikoColors.sky,
    ),
    Exercise.completeWords: GameStyle(
      Icons.spellcheck_rounded,
      'Completar palabras',
      'Arrastra las letras que faltan a su casilla (o tócalas). Si es una frase, al final ordena las palabras.',
      AikoColors.violetBright,
    ),
    Exercise.rememberImages: GameStyle(
      Icons.style_rounded,
      'Recordar imágenes',
      'Mira las tarjetas con atención. Cuando se volteen, escribe qué había en cada una.',
      AikoColors.mint,
    ),
    Exercise.logic: GameStyle(
      Icons.calculate_rounded,
      'Lógica matemática',
      'Lee el problema con calma, elige una respuesta y pulsa Comprobar.',
      Color(0xFFE07B39),
    ),
  };

  static const _fallback = GameStyle(
    Icons.extension_rounded,
    'Ejercicio',
    'Sigue las instrucciones de tu especialista.',
    AikoColors.lilac,
  );

  static GameStyle of(String tipo) => _styles[tipo] ?? _fallback;

  /// Tipos que ya tienen juego en la app.
  static List<String> get playableTypes => _styles.keys.toList();
}

/// Colores de cada día del camino (se repiten en ciclo).
class DayTheme {
  const DayTheme(this.color, this.soft, this.deep);

  final Color color;
  final Color soft;
  final Color deep;

  static const _themes = [
    DayTheme(AikoColors.violet, AikoColors.lilacSoft, AikoColors.violetDeep),
    DayTheme(AikoColors.mint, AikoColors.mintSoft, Color(0xFF1F7A58)),
    DayTheme(AikoColors.sky, AikoColors.skySoft, Color(0xFF2559B8)),
    DayTheme(Color(0xFFE07B39), AikoColors.peachSoft, Color(0xFF9A4A1F)),
  ];

  static DayTheme of(int dayNumber) => _themes[(dayNumber - 1) % _themes.length];
}
