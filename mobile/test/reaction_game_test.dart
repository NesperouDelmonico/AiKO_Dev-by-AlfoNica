import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aiko_mobile/features/games/game_outcome.dart';
import 'package:aiko_mobile/features/games/reaction_game_screen.dart';

void main() {
  group('GameOutcome.fromReactions', () {
    test('puntaje es el porcentaje de aciertos y el tiempo su promedio', () {
      final outcome = GameOutcome.fromReactions(
        intentos: 10,
        tiemposAciertoMs: [300, 400, 500, 400, 400, 400, 400],
      );
      expect(outcome.aciertos, 7);
      expect(outcome.puntaje, 70);
      expect(outcome.tiempoReaccionMs, 400);
      expect(outcome.toJson(), {
        'puntaje': 70,
        'aciertos': 7,
        'tiempo_reaccion_ms': 400,
      });
    });

    test('sin aciertos no envía tiempo', () {
      final outcome =
          GameOutcome.fromReactions(intentos: 5, tiemposAciertoMs: []);
      expect(outcome.puntaje, 0);
      expect(outcome.tiempoReaccionMs, isNull);
      expect(outcome.toJson().containsKey('tiempo_reaccion_ms'), isFalse);
    });
  });

  testWidgets('una partida de 2 intentos: un acierto y un tiempo agotado',
      (tester) async {
    GameOutcome? result;
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () async {
              result = await Navigator.of(context).push<GameOutcome>(
                MaterialPageRoute(
                  builder: (_) => ReactionGameScreen(
                    intentos: 2,
                    tiempoLimiteMs: 1000,
                    random: Random(1),
                  ),
                ),
              );
            },
            child: const Text('jugar'),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('jugar'));
    await tester.pumpAndSettle();

    // Cuenta regresiva 3, 2, 1.
    for (var i = 0; i < 3; i++) {
      await tester.pump(const Duration(seconds: 1));
    }
    final target = find.byKey(const ValueKey('reaction-target'));

    // Intento 1: aparece el círculo y se toca.
    await tester.pump(const Duration(seconds: 3));
    expect(target, findsOneWidget);
    await tester.tap(target);
    await tester.pump();
    expect(find.textContaining('¡Bien!'), findsOneWidget);

    // Intento 2: aparece y se deja pasar el tiempo.
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 3));
    expect(target, findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1100));
    expect(find.text('Se acabó el tiempo'), findsOneWidget);

    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
    expect(result, isNotNull);
    expect(result!.intentos, 2);
    expect(result!.aciertos, 1);
    expect(result!.puntaje, 50);
  });
}
