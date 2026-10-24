import 'dart:math';

import 'package:flutter_test/flutter_test.dart';

import 'package:aiko_mobile/core/dates.dart';
import 'package:aiko_mobile/core/models.dart';
import 'package:aiko_mobile/features/games/text_match.dart';
import 'package:aiko_mobile/features/games/word_puzzle.dart';

void main() {
  group('matchesAnyKeyword', () {
    test('ignora tildes, mayúsculas y signos', () {
      expect(matchesAnyKeyword('¡Un CAMIÓN rojo!', ['camion']), isTrue);
      expect(matchesAnyKeyword('un perro', ['gato', 'perro']), isTrue);
    });

    test('exige la palabra completa y respuesta no vacía', () {
      expect(matchesAnyKeyword('perrera', ['perro']), isFalse);
      expect(matchesAnyKeyword('   ', ['perro']), isFalse);
    });

    test('acepta palabras clave de varias palabras', () {
      expect(matchesAnyKeyword('es una casa grande', ['casa grande']), isTrue);
    });
  });

  group('buildPuzzle', () {
    test('oculta letras dejando al menos una visible y arma el banco', () {
      final words = buildPuzzle('El gato duerme.', 2, Random(3));
      expect(words.map((w) => w.text), ['El', 'gato', 'duerme.']);
      expect(words[0].hidden, hasLength(1)); // "El": 2 letras → oculta 1
      expect(words[1].hidden, hasLength(2));
      // El punto nunca se oculta.
      expect(words[2].hidden.contains(6), isFalse);
      for (final word in words) {
        final missing = [for (final i in word.hidden) word.chars[i]];
        final bank = word.bank.map((t) => t.char).toList();
        for (final letter in missing) {
          expect(bank.contains(letter), isTrue);
        }
        expect(word.bank.length, greaterThan(word.hidden.length));
      }
    });

    test('una palabra de una letra se oculta entera', () {
      expect(buildPuzzle('y', 3, Random(1)).single.hidden, [0]);
    });
  });

  test('shuffledOrder no deja la frase en su orden original', () {
    final words = ['el', 'gato', 'duerme'];
    for (var seed = 0; seed < 20; seed++) {
      final order = shuffledOrder(3, Random(seed), words);
      expect(order.toSet(), {0, 1, 2});
      expect(order, isNot([0, 1, 2]));
    }
  });

  test('puzzleScore descuenta errores y piezas faltantes', () {
    expect(puzzleScore(placed: 10, total: 10, errors: 0), 100);
    expect(puzzleScore(placed: 10, total: 10, errors: 10), 50);
    expect(puzzleScore(placed: 5, total: 10, errors: 0), 50);
  });

  test('Exercise deduce el tipo y RouteAgenda bloquea días', () {
    final exercise = Exercise.fromJson({
      'id': 'e',
      'nombre': 'X',
      'categoria': 'Velocidad',
      'parametros': {
        'preguntas': [
          {'enunciado': '¿2+2?'}
        ]
      },
    });
    expect(exercise.tipo, Exercise.reaction);
    expect(exercise.paramObjects('preguntas').single['enunciado'], '¿2+2?');

    final agenda = RouteAgenda.fromJson(
        {'dia_actual': 2, 'disponible': false, 'disponible_desde': '2026-10-19'});
    expect(agenda.isLocked(2), isTrue);
    expect(agenda.isLocked(1), isFalse);
    expect(agenda.isPlayable(2), isFalse);
    expect(const RouteAgenda().isPlayable(1), isTrue);
  });

  test('shortDate muestra día y mes', () {
    expect(shortDate('2026-10-19'), '19 oct');
    expect(shortDate('mañana'), 'mañana');
  });
}
