import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:aiko_mobile/core/app_settings.dart';
import 'package:aiko_mobile/core/game_style.dart';
import 'package:aiko_mobile/core/models.dart';
import 'package:aiko_mobile/features/exercises/exercises_screen.dart';
import 'package:aiko_mobile/features/progress/progress_repository.dart';
import 'package:aiko_mobile/widgets/mascot.dart';
import 'package:aiko_mobile/widgets/motion.dart';

RouteExercise step(String id, String exerciseId, String estado) => RouteExercise(
      id: id,
      orden: 1,
      estado: estado,
      ejercicio: Exercise(
        id: exerciseId,
        nombre: exerciseId,
        categoria: 'Memoria',
        instrucciones: '',
        nivel: 1,
        tipo: Exercise.logic,
      ),
    );

void main() {
  test('levelProgress calcula el avance dentro del nivel', () {
    expect(levelProgress(0), (progress: 0.0, remaining: 100));
    expect(levelProgress(140), (progress: 0.4, remaining: 60));
  });

  test('summarize agrupa ejercicios repetidos de la ruta', () {
    final result = summarize([
      step('a', 'e1', RouteExercise.completed),
      step('b', 'e2', RouteExercise.pending),
      step('c', 'e1', RouteExercise.pending),
    ]);
    expect(result.map((s) => s.exercise.id), ['e1', 'e2']);
    expect(result.first.times, 2);
    expect(result.first.done, 1);
  });

  test('GameStyle tiene estilo para cada juego disponible', () {
    for (final type in GameStyle.playableTypes) {
      expect(GameStyle.of(type).label, isNot('Ejercicio'));
    }
    expect(GameStyle.of('desconocido').label, 'Ejercicio');
  });

  test('AppSettings guarda y recupera las preferencias', () async {
    SharedPreferences.setMockInitialValues({});
    final settings = AppSettings();
    await settings.load();
    expect(settings.textSize, TextSizeOption.normal);
    await settings.setTextSize(TextSizeOption.large);
    await settings.setReduceMotion(true);

    final again = AppSettings();
    await again.load();
    expect(again.textSize, TextSizeOption.large);
    expect(again.reduceMotion, isTrue);
  });

  testWidgets('logo y animaciones se muestran sin movimiento si se pide', (tester) async {
    await tester.pumpWidget(MaterialApp(
      // Igual que "Reducir animaciones" en Ajustes.
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: true),
        child: child!,
      ),
      home: const Scaffold(
        body: Column(
          children: [
            FadeSlideIn(child: AikoLogo(mascotSize: 80)),
            CountUp(value: 42, suffix: ' XP'),
          ],
        ),
      ),
    ));
    await tester.pump();
    expect(find.text('AiKO'), findsOneWidget);
    // Sin animaciones el contador muestra el valor final de inmediato.
    expect(find.text('42 XP'), findsOneWidget);
  });
}
