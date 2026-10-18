import 'package:flutter/material.dart';

import '../../core/models.dart';
import 'complete_words_game_screen.dart';
import 'game_outcome.dart';
import 'logic_game_screen.dart';
import 'memory_cards_game_screen.dart';
import 'reaction_game_screen.dart';
import 'result_screen.dart';

/// Construye el mini-juego de un ejercicio según su tipo, o null si ese
/// tipo aún no tiene juego en la app (o le faltan datos).
Widget? gameFor(Exercise exercise) {
  switch (exercise.tipo) {
    case Exercise.reaction: {
        return ReactionGameScreen(
          intentos: exercise.param('intentos', 10).clamp(5, 30),
          tiempoLimiteMs: exercise.param('tiempo_limite_ms', 1500).clamp(300, 3000),
        );
      }
    case Exercise.completeWords: {
        final phrase = exercise.paramString('frase');
        if (phrase == null) return null;
        return CompleteWordsGameScreen(
          frase: phrase,
          imagenId: exercise.paramString('imagen_id'),
          letrasOcultas: exercise.param('letras_ocultas', 2).clamp(1, 4),
          duracionSegundos: exercise.param('duracion_segundos', 300).clamp(60, 600),
        );
      }
    case Exercise.rememberImages: {
        final cards = exercise
            .paramObjects('imagenes')
            .map(MemoryCard.fromJson)
            .whereType<MemoryCard>()
            .toList();
        if (cards.isEmpty) return null;
        return MemoryCardsGameScreen(
          cards: cards,
          segundos: exercise.param('tiempo_visualizacion_segundos', 8).clamp(3, 30),
        );
      }
    case Exercise.logic: {
        final questions = exercise
            .paramObjects('preguntas')
            .map(LogicQuestion.fromJson)
            .whereType<LogicQuestion>()
            .toList();
        if (questions.isEmpty) return null;
        return LogicGameScreen(preguntas: questions);
      }
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
    final outcome = await Navigator.of(context).push<GameOutcome>(
      MaterialPageRoute(builder: (_) => game, fullscreenDialog: true),
    );
    if (outcome == null || !context.mounted) return submitted;
    final action = await Navigator.of(context).push<ResultAction>(
      MaterialPageRoute(
        builder: (_) => ResultScreen(
          routeId: routeId,
          routeExerciseId: item.id,
          exerciseName: item.ejercicio.nombre,
          outcome: outcome,
        ),
      ),
    );
    submitted = true;
    if (action != ResultAction.retry) return submitted;
  }
}
