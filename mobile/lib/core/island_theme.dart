import 'package:flutter/material.dart';

import 'models.dart';
import 'theme.dart';

/// Apariencia de la isla de un día, según el tipo de ejercicio que más
/// tiene ese día (ver `assets/brand/ia/island_*.png` y `header_*.png`).
class IslandTheme {
  const IslandTheme({
    required this.key,
    required this.name,
    required this.tagline,
    required this.icon,
    required this.color,
    required this.soft,
    required this.deep,
  });

  /// Sufijo de las imágenes: island_<key>.png, header_<key>.png.
  final String key;
  final String name;
  final String tagline;
  final IconData icon;
  final Color color;
  final Color soft;
  final Color deep;

  String get islandImage => 'island_$key';
  String get headerImage => 'header_$key';

  static const atencion = IslandTheme(
    key: 'atencion',
    name: 'Isla del Faro',
    tagline: 'Enfoca tu atención y observa con calma.',
    icon: Icons.wb_twilight_rounded,
    color: Color(0xFFE9A23B),
    soft: Color(0xFFFFF0D6),
    deep: Color(0xFF9A5B12),
  );
  static const memoria = IslandTheme(
    key: 'memoria',
    name: 'Isla del Gran Árbol',
    tagline: 'Recuerda, relaciona y fortalece tu memoria.',
    icon: Icons.park_rounded,
    color: AikoColors.mint,
    soft: AikoColors.mintSoft,
    deep: Color(0xFF1F7A58),
  );
  static const reaccion = IslandTheme(
    key: 'reaccion',
    name: 'Isla del Molino',
    tagline: 'Responde rápido y con precisión.',
    icon: Icons.bolt_rounded,
    color: AikoColors.sky,
    soft: AikoColors.skySoft,
    deep: Color(0xFF2559B8),
  );
  static const palabras = IslandTheme(
    key: 'palabras',
    name: 'Isla de las Palabras',
    tagline: 'Juega con letras y frases.',
    icon: Icons.menu_book_rounded,
    color: AikoColors.violetBright,
    soft: AikoColors.lilacSoft,
    deep: AikoColors.violetDeep,
  );
  static const imagenes = IslandTheme(
    key: 'imagenes',
    name: 'Isla de los Recuerdos',
    tagline: 'Observa las imágenes y guárdalas en tu memoria.',
    icon: Icons.photo_album_rounded,
    color: Color(0xFFE0739C),
    soft: Color(0xFFFFE3EE),
    deep: Color(0xFF9C3561),
  );
  static const logica = IslandTheme(
    key: 'logica',
    name: 'Isla de Cristal',
    tagline: 'Piensa paso a paso y resuelve.',
    icon: Icons.diamond_rounded,
    color: Color(0xFFE07B39),
    soft: AikoColors.peachSoft,
    deep: Color(0xFF9A4A1F),
  );
  static const mixta = IslandTheme(
    key: 'mixta',
    name: 'Isla de AiKO',
    tagline: 'Un poco de todo para entrenar tu mente.',
    icon: Icons.cottage_rounded,
    color: AikoColors.violet,
    soft: AikoColors.lilacSoft,
    deep: AikoColors.violetDeep,
  );
  static const meta = IslandTheme(
    key: 'meta',
    name: 'Meta',
    tagline: 'El final de tu ruta.',
    icon: Icons.emoji_events_rounded,
    color: AikoColors.star,
    soft: Color(0xFFFFF6D1),
    deep: Color(0xFF8A5A00),
  );

  static const _byType = {
    'atencion_sostenida': atencion,
    'memoria_secuencias': memoria,
    Exercise.reaction: reaccion,
    Exercise.completeWords: palabras,
    Exercise.rememberImages: imagenes,
    Exercise.logic: logica,
  };

  static const _byCategory = {
    'Atención': atencion,
    'Memoria': memoria,
    'Velocidad': reaccion,
  };

  static IslandTheme ofExercise(Exercise exercise) =>
      _byType[exercise.tipo] ?? _byCategory[exercise.categoria] ?? mixta;

  /// Tema del tipo de ejercicio con al menos la mitad de los ejercicios
  /// del día; si ninguno llega, la isla es "mixta".
  static IslandTheme forDay(RouteDay day) {
    if (day.ejercicios.isEmpty) return mixta;
    final counts = <IslandTheme, int>{};
    for (final item in day.ejercicios) {
      final theme = ofExercise(item.ejercicio);
      counts[theme] = (counts[theme] ?? 0) + 1;
    }
    final best = counts.entries.reduce((a, b) => b.value > a.value ? b : a);
    return best.value * 2 >= day.ejercicios.length ? best.key : mixta;
  }
}

/// Estado de un día de la ruta en el mapa.
enum IslandState { done, today, waiting, locked }

IslandState islandState(RouteDay day, RouteAgenda agenda) {
  if (day.isComplete) return IslandState.done;
  if (day.dia < agenda.diaActual) return IslandState.today; // pendiente atrasado
  if (day.dia == agenda.diaActual) {
    return agenda.disponible ? IslandState.today : IslandState.waiting;
  }
  return IslandState.locked;
}
