import 'package:flutter/material.dart';

import 'models.dart';
import 'theme.dart';

/// Ícono, nombre y explicación breve de cada mini-juego.
class GameStyle {
  const GameStyle(this.icon, this.label, this.howTo, this.color, [this.category = '']);

  final IconData icon;
  final String label;
  final String howTo;
  final Color color;

  /// Clasificación cognitiva: Atención, Memoria o Velocidad.
  final String category;

  static const categories = ['Atención', 'Memoria', 'Velocidad'];

  static const _styles = {
    Exercise.completeWords: GameStyle(
      Icons.spellcheck_rounded,
      'Completar palabras',
      'Arrastra (o toca) las fichas de letras para completar cada palabra. Después vienen frases.',
      AikoColors.violetBright,
      'Atención',
    ),
    Exercise.logic: GameStyle(
      Icons.calculate_rounded,
      'Lógica matemática',
      'Lee el problema con calma y toca la respuesta. La correcta se pinta de verde.',
      Color(0xFFE07B39),
      'Atención',
    ),
    Exercise.rememberImages: GameStyle(
      Icons.style_rounded,
      'Recordar imágenes',
      'Mira las imágenes unos segundos. Cuando se oculten, nómbralas o ubícalas y luego dibuja lo que recuerdes.',
      Color(0xFFE0739C),
      'Memoria',
    ),
    Exercise.colorSequence: GameStyle(
      Icons.music_note_rounded,
      'Secuencia de colores',
      'Los botones se iluminan con una nota. Repite la secuencia; en cada ronda se agrega uno más.',
      AikoColors.mint,
      'Memoria',
    ),
    Exercise.colorTap: GameStyle(
      Icons.palette_rounded,
      'Toque de color',
      'Aparece el nombre de un color: toca rápido el botón de ese color.',
      AikoColors.sky,
      'Velocidad',
    ),
    Exercise.findImage: GameStyle(
      Icons.image_search_rounded,
      'Busca la imagen',
      'Mira la figura de arriba y encuéntrala lo más rápido que puedas en la cuadrícula.',
      Color(0xFFE9A23B),
      'Velocidad',
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

  /// Juegos de una clasificación.
  static List<String> typesOf(String category) =>
      [for (final e in _styles.entries) if (e.value.category == category) e.key];
}

/// Colores de cada día del camino (se repiten en ciclo).
class DayTheme {
  const DayTheme(this.color, this._soft, this._deep);

  final Color color;
  final Color _soft;
  final Color _deep;

  Color get soft => AikoColors.tint(color, _soft);
  Color get deep => AikoColors.deep(color, _deep);

  static const _themes = [
    DayTheme(AikoColors.brand, Color(0xFFE9E1FF), Color(0xFF4C1D95)),
    DayTheme(AikoColors.mint, Color(0xFFDDF6EC), Color(0xFF1F7A58)),
    DayTheme(AikoColors.sky, Color(0xFFE1ECFF), Color(0xFF2559B8)),
    DayTheme(Color(0xFFE07B39), Color(0xFFFFE8DB), Color(0xFF9A4A1F)),
  ];

  static DayTheme of(int dayNumber) => _themes[(dayNumber - 1) % _themes.length];
}
