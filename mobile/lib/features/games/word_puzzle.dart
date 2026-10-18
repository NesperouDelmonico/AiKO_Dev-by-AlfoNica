import 'dart:math';

/// Una letra arrastrable del banco (el id permite letras repetidas).
class LetterTile {
  const LetterTile(this.id, this.char);
  final int id;
  final String char;
}

/// Una palabra con algunas letras ocultas.
class PuzzleWord {
  PuzzleWord({required this.text, required this.hidden, required this.bank});

  /// Palabra tal como aparece en la frase (puede tener signos).
  final String text;

  /// Posiciones (índices de carácter) ocultas, en orden.
  final List<int> hidden;

  /// Letras que faltan más algunas de distracción, mezcladas.
  final List<LetterTile> bank;

  List<String> get chars => text.split('');
}

final _letter = RegExp(r'\p{L}', unicode: true);
const _alphabet = 'abcdefghijlmnoprstuv';

/// Genera el ejercicio "Completar palabras": para cada palabra oculta hasta
/// [lettersPerWord] letras (dejando al menos una visible si la palabra tiene
/// más de una letra) y prepara un banco con letras de distracción.
List<PuzzleWord> buildPuzzle(String phrase, int lettersPerWord, Random random) {
  var nextId = 0;
  return phrase
      .trim()
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty)
      .map((word) {
    final chars = word.split('');
    final letterPositions = [
      for (var i = 0; i < chars.length; i++)
        if (_letter.hasMatch(chars[i])) i,
    ];
    if (letterPositions.isEmpty) {
      return PuzzleWord(text: word, hidden: const [], bank: const []);
    }
    final count = letterPositions.length == 1
        ? 1
        : min(lettersPerWord, letterPositions.length - 1);
    final hidden = (List.of(letterPositions)..shuffle(random)).take(count).toList()
      ..sort();
    final isUpper = chars[hidden.first] == chars[hidden.first].toUpperCase();
    final distractors = List.generate(min(2, count + 1), (_) {
      final c = _alphabet[random.nextInt(_alphabet.length)];
      return isUpper ? c.toUpperCase() : c;
    });
    final bank = [
      for (final position in hidden) LetterTile(nextId++, chars[position]),
      for (final c in distractors) LetterTile(nextId++, c),
    ]..shuffle(random);
    return PuzzleWord(text: word, hidden: hidden, bank: bank);
  }).toList();
}

/// Orden mezclado de las palabras para la etapa de armar la frase; nunca
/// queda igual al original si hay más de una palabra distinta.
List<int> shuffledOrder(int count, Random random, List<String> words) {
  final order = List.generate(count, (i) => i);
  if (count < 2 || words.toSet().length < 2) return order;
  do {
    order.shuffle(random);
  } while ([for (final i in order) words[i]].join(' ') == words.join(' '));
  return order;
}

/// Puntaje: piezas bien puestas sobre (piezas totales + errores).
/// Las piezas sin poner al acabarse el tiempo cuentan como no logradas.
int puzzleScore({required int placed, required int total, required int errors}) {
  if (total == 0) return 100;
  return ((placed * 100) / (total + errors)).round().clamp(0, 100);
}
