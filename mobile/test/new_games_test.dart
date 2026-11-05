import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aiko_mobile/core/game_style.dart';
import 'package:aiko_mobile/core/models.dart';
import 'package:aiko_mobile/features/games/color_sequence_game_screen.dart';
import 'package:aiko_mobile/features/games/color_tap_game_screen.dart';
import 'package:aiko_mobile/features/games/complete_words_game_screen.dart';
import 'package:aiko_mobile/features/games/find_image_game_screen.dart';
import 'package:aiko_mobile/features/games/game_outcome.dart';
import 'package:aiko_mobile/features/games/games.dart';
import 'package:aiko_mobile/features/games/logic_game_screen.dart';
import 'package:aiko_mobile/features/games/memory_cards_game_screen.dart';
import 'package:aiko_mobile/features/games/tones.dart';
import 'package:aiko_mobile/features/games/word_puzzle.dart';

/// Abre [game] desde un botón y guarda lo que devuelve.
Future<GameOutcome? Function()> openGame(WidgetTester tester, Widget game) async {
  GameOutcome? result;
  await tester.pumpWidget(MaterialApp(
    home: Builder(
      builder: (context) => Scaffold(
        body: TextButton(
          onPressed: () async {
            result = await Navigator.of(context).push<GameOutcome>(
              MaterialPageRoute(builder: (_) => game),
            );
          },
          child: const Text('jugar'),
        ),
      ),
    ),
  ));
  await tester.tap(find.text('jugar'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  return () => result;
}

Future<void> advance(WidgetTester tester, Duration total) async {
  const step = Duration(milliseconds: 100);
  for (var t = Duration.zero; t < total; t += step) {
    await tester.pump(step);
  }
}

Exercise exercise(String tipo, Map<String, dynamic> params) => Exercise.fromJson({
      'id': 'e',
      'nombre': 'X',
      'categoria': Exercise.categoryByType[tipo] ?? 'Atención',
      'tipo': tipo,
      'parametros': params,
    });

void main() {
  group('GameOutcome', () {
    test('puntaje es el porcentaje de aciertos y el tiempo su promedio', () {
      final outcome = GameOutcome.fromReactions(
        intentos: 10,
        tiemposAciertoMs: [300, 400, 500, 400, 400, 400, 400],
      );
      expect(outcome.puntaje, 70);
      expect(outcome.tiempoReaccionMs, 400);
      expect(outcome.toJson(), {'puntaje': 70, 'aciertos': 7, 'tiempo_reaccion_ms': 400});
    });

    test('envía los ids de los dibujos y conserva los PNG', () {
      final png = Uint8List.fromList([1, 2, 3]);
      final outcome = GameOutcome(puntaje: 50, aciertos: 1, intentos: 2, dibujos: [png])
          .withDuration(1000);
      expect(outcome.dibujos.single, png);
      expect(outcome.toJson(dibujoIds: ['a'])['dibujos'], ['a']);
      expect(outcome.toJson().containsKey('dibujos'), isFalse);
    });
  });

  test('cada juego vigente tiene estilo y clasificación', () {
    for (final category in GameStyle.categories) {
      expect(GameStyle.typesOf(category), hasLength(2));
    }
    for (final type in GameStyle.playableTypes) {
      expect(GameStyle.of(type).category, Exercise.categoryByType[type]);
    }
  });

  test('gameFor arma cada juego y descarta los retirados o incompletos', () {
    expect(gameFor(exercise(Exercise.completeWords, {'palabras': ['casa']})),
        isA<CompleteWordsGameScreen>());
    expect(gameFor(exercise(Exercise.completeWords, {})), isNull);
    expect(gameFor(exercise(Exercise.colorSequence, {})), isA<ColorSequenceGameScreen>());
    expect(gameFor(exercise(Exercise.colorTap, {})), isA<ColorTapGameScreen>());
    expect(gameFor(exercise(Exercise.findImage, {'cuadricula': 16})), isA<FindImageGameScreen>());
    expect(
        gameFor(exercise(Exercise.rememberImages, {
          'modo': 'relacionar',
          'imagenes': [
            {'imagen_id': 'a', 'respuestas': []},
            {'imagen_id': 'b', 'respuestas': []},
          ],
        })),
        isA<MemoryCardsGameScreen>());
    expect(
        gameFor(exercise(Exercise.rememberImages, {
          'imagenes': [
            {'imagen_id': 'a', 'respuestas': []},
          ],
        })),
        isNull);
    expect(gameFor(exercise(Exercise.reaction, {'intentos': 10})), isNull);
  });

  test('sineWav arma un WAV válido', () {
    final wav = sineWav(440, durationMs: 100, sampleRate: 8000);
    expect(String.fromCharCodes(wav.sublist(0, 4)), 'RIFF');
    expect(String.fromCharCodes(wav.sublist(8, 12)), 'WAVE');
    expect(wav.length, 44 + 800 * 2);
  });

  test('puntos de scrabble ignoran tildes', () {
    expect(scrabblePoints('a'), 1);
    expect(scrabblePoints('Á'), 1);
    expect(scrabblePoints('z'), 10);
  });

  testWidgets('completar palabras: ficha correcta, mensaje de ánimo y puntaje',
      (tester) async {
    final hidden = buildPuzzle('sol', 1, Random(1)).single;
    final letter = hidden.chars[hidden.hidden.single].toUpperCase();
    final result = await openGame(
      tester,
      CompleteWordsGameScreen(
        palabras: const ['sol'],
        letrasFaltantes: 1,
        intentos: 2,
        duracionSegundos: 120,
        random: Random(1),
      ),
    );
    await tester.tap(find.text(letter).last);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('sol'), findsOneWidget); // mensaje de ánimo
    await advance(tester, const Duration(seconds: 2));
    expect(result(), isNotNull);
    expect(result()!.puntaje, 100);
    expect(result()!.aciertos, 1);
  });

  testWidgets('lógica: al responder mal la correcta queda marcada', (tester) async {
    final result = await openGame(
      tester,
      const LogicGameScreen(
        preguntas: [
          LogicQuestion(enunciado: '¿2 + 2?', opciones: ['3', '4', '5'], correcta: 1),
        ],
        duracionSegundos: 60,
      ),
    );
    await tester.tap(find.text('3'));
    await tester.pump();
    expect(find.textContaining('La respuesta era B'), findsOneWidget);
    expect(find.byIcon(Icons.check_rounded), findsOneWidget);
    expect(find.byIcon(Icons.close_rounded), findsNWidgets(2));
    await tester.tap(find.text('TERMINAR'));
    await advance(tester, const Duration(milliseconds: 600));
    expect(result()!.puntaje, 0);
    expect(result()!.intentos, 1);
  });

  testWidgets('toque de color: un acierto y el resto sin responder', (tester) async {
    final semantics = tester.ensureSemantics();
    final result = await openGame(
      tester,
      ColorTapGameScreen(rondas: 5, colores: 3, tiempoLimiteMs: 800, random: Random(4)),
    );
    await advance(tester, const Duration(milliseconds: 3950));
    // Espera a que aparezca la palabra.
    String? word;
    for (var i = 0; i < 12 && word == null; i++) {
      await tester.pump(const Duration(milliseconds: 100));
      for (final color in tapColors.take(3)) {
        if (find.text(color.$1).evaluate().isNotEmpty) word = color.$1;
      }
    }
    expect(word, isNotNull);
    await tester.tap(find.bySemanticsLabel('Botón ${word!.toLowerCase()}'));
    await tester.pump();
    expect(find.byIcon(Icons.check_circle_rounded), findsOneWidget);
    await advance(tester, const Duration(seconds: 12));
    expect(result(), isNotNull);
    expect(result()!.aciertos, 1);
    expect(result()!.puntaje, 20);
    semantics.dispose();
  });

  testWidgets('busca la imagen: cuadrícula y rondas sin responder', (tester) async {
    final result = await openGame(
      tester,
      FindImageGameScreen(rondas: 5, cuadricula: 4, tiempoLimiteMs: 1500, random: Random(3)),
    );
    await advance(tester, const Duration(seconds: 3));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Encuentra esta figura'), findsOneWidget);
    expect(find.byType(GridView), findsOneWidget);
    await advance(tester, const Duration(seconds: 15));
    expect(result()!.puntaje, 0);
    expect(result()!.intentos, 5);
  });

  testWidgets('secuencia de colores: sin respuesta se gasta el único intento',
      (tester) async {
    final result = await openGame(
      tester,
      ColorSequenceGameScreen(
        botones: 3,
        rondas: 3,
        intentos: 1,
        tiempoRespuestaSegundos: 5,
        tones: const SilentTonePlayer(),
        random: Random(2),
      ),
    );
    await advance(tester, const Duration(seconds: 3));
    expect(find.text('Tu turno'), findsOneWidget);
    await advance(tester, const Duration(seconds: 5));
    expect(find.text('Se acabaron los intentos.'), findsOneWidget);
    await advance(tester, const Duration(seconds: 2));
    expect(result()!.puntaje, 0);
    expect(result()!.intentos, 3);
  });
}
