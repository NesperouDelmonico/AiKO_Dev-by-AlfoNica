import 'package:flutter/material.dart';

import '../../core/models.dart';
import '../../core/theme.dart';
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
