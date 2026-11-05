import 'package:flutter/material.dart';

import '../../core/models.dart';
import '../../core/theme.dart';
import 'color_sequence_game_screen.dart';
import 'color_tap_game_screen.dart';
import 'complete_words_game_screen.dart';
import 'find_image_game_screen.dart';
import 'game_outcome.dart';
import 'logic_game_screen.dart';
import 'memory_cards_game_screen.dart';
import 'result_screen.dart';

/// Construye el mini-juego de un ejercicio según su tipo, o null si ese
/// tipo no tiene juego (p. ej. los retirados) o le faltan datos.
Widget? gameFor(Exercise exercise) {
  final total = exercise.param('duracion_segundos', 300).clamp(60, 900);
  switch (exercise.tipo) {
    case Exercise.completeWords:
      {
        final words = exercise.paramStrings('palabras');
        final phrases = exercise.paramStrings('frases');
        if (words.isEmpty && phrases.isEmpty) return null;
        return CompleteWordsGameScreen(
          palabras: words,
          frases: phrases,
          imagenId: exercise.paramString('imagen_id'),
          letrasFaltantes: exercise.param('letras_faltantes', 2).clamp(1, 4),
          intentos: exercise.param('intentos', 3).clamp(1, 10),
          duracionSegundos: total,
        );
      }
    case Exercise.logic:
      {
        final questions = exercise
            .paramObjects('preguntas')
            .map(LogicQuestion.fromJson)
            .whereType<LogicQuestion>()
            .toList();
        if (questions.isEmpty) return null;
        return LogicGameScreen(preguntas: questions, duracionSegundos: total);
      }
    case Exercise.rememberImages:
      {
        final mode = RecallMode.parse(exercise.paramString('modo'));
        final cards = exercise
            .paramObjects('imagenes')
            .map(MemoryCard.fromJson)
            .whereType<MemoryCard>()
            .where((c) => mode == RecallMode.relacionar || c.respuestas.isNotEmpty)
            .toList();
        if (cards.length < (mode == RecallMode.relacionar ? 2 : 1)) return null;
        return MemoryCardsGameScreen(
          cards: cards,
          modo: mode,
          dibujar: exercise.paramBool('dibujar', true),
          segundos: exercise.param('tiempo_visualizacion_segundos', 8).clamp(3, 30),
          duracionSegundos: total,
        );
      }
    case Exercise.colorSequence:
      return ColorSequenceGameScreen(
        botones: exercise.param('botones', 4).clamp(3, 9),
        rondas: exercise.param('rondas', 6).clamp(3, 12),
        intentos: exercise.param('intentos', 3).clamp(1, 5),
        tiempoRespuestaSegundos: exercise.param('tiempo_respuesta_segundos', 15).clamp(5, 60),
      );
    case Exercise.colorTap:
      return ColorTapGameScreen(
        rondas: exercise.param('rondas', 15).clamp(5, 40),
        colores: exercise.param('colores', 4).clamp(3, 6),
        tiempoLimiteMs: exercise.param('tiempo_limite_ms', 2500).clamp(800, 5000),
        interferencia: exercise.paramBool('interferencia', false),
      );
    case Exercise.findImage:
      return FindImageGameScreen(
        rondas: exercise.param('rondas', 10).clamp(5, 30),
        cuadricula: exercise.param('cuadricula', 9),
        tiempoLimiteMs: exercise.param('tiempo_limite_ms', 6000).clamp(1500, 15000),
      );
  }
  return null;
}

bool hasGame(Exercise exercise) => gameFor(exercise) != null;

/// Juega el ejercicio, envía el resultado y permite reintentar si no llegó
/// al mínimo. Devuelve true si se registró al menos un resultado.
Future<bool> playExercise(
  BuildContext context, {
  required String routeId,
  required RouteExercise item,
}) async {
  var submitted = false;
  while (true) {
    final game = gameFor(item.ejercicio);
    if (game == null || !context.mounted) return submitted;
    final clock = Stopwatch()..start();
    final played = await Navigator.of(context).push<GameOutcome>(
      MaterialPageRoute(builder: (_) => game, fullscreenDialog: true),
    );
    if (played == null || !context.mounted) return submitted;
    final outcome = played.withDuration(clock.elapsedMilliseconds);
    final action = await Navigator.of(context).push<ResultAction>(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 450),
        pageBuilder: (_, __, ___) => ResultScreen(
          routeId: routeId,
          routeExerciseId: item.id,
          exercise: item.ejercicio,
          outcome: outcome,
        ),
        transitionsBuilder: (_, animation, __, child) => FadeTransition(
          opacity: animation,
          child: ScaleTransition(
            scale: Tween(begin: 0.96, end: 1.0).animate(
                CurvedAnimation(parent: animation, curve: Curves.easeOutBack)),
            child: child,
          ),
        ),
      ),
    );
    submitted = true;
    if (action != ResultAction.retry) return submitted;
  }
}

/// Práctica libre: juega el ejercicio sin enviar el resultado (no cuenta
/// para la ruta ni da XP) y muestra cómo le fue.
Future<void> practiceExercise(BuildContext context, Exercise exercise) async {
  while (true) {
    final game = gameFor(exercise);
    if (game == null || !context.mounted) return;
    final outcome = await Navigator.of(context).push<GameOutcome>(
      MaterialPageRoute(builder: (_) => game, fullscreenDialog: true),
    );
    if (outcome == null || !context.mounted) return;
    final again = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Práctica terminada'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('${outcome.puntaje}%',
                style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w900)),
            Text('${outcome.aciertos} de ${outcome.intentos} aciertos'
                '${outcome.tiempoReaccionMs == null ? '' : ' · ${outcome.tiempoReaccionMs} ms'}'),
            const SizedBox(height: 10),
            const Text('La práctica no cuenta para tu ruta.',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 13)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Listo'),
          ),
          FilledButton(
            style: dialogButtonStyle,
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Otra vez'),
          ),
        ],
      ),
    );
    if (again != true) return;
  }
}
