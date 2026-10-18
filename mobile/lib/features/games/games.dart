import 'package:flutter/material.dart';

import '../../core/models.dart';
import 'game_outcome.dart';
import 'reaction_game_screen.dart';
import 'result_screen.dart';

/// Construye el mini-juego de un ejercicio, o null si su categoría aún no
/// tiene juego.
Widget? gameFor(Exercise exercise) {
  switch (exercise.categoria) {
    case 'Velocidad':
      return ReactionGameScreen(
        intentos: exercise.param('intentos', 10).clamp(5, 30),
        tiempoLimiteMs: exercise.param('tiempo_limite_ms', 1500).clamp(300, 3000),
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
  while (context.mounted) {
    final game = gameFor(item.ejercicio);
    if (game == null) return submitted;
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
  return submitted;
}
