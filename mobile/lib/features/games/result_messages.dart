import '../../core/island_theme.dart';
import '../../core/models.dart';

/// Título y mensaje del cierre de un ejercicio, según el tipo de juego y
/// si se alcanzó el puntaje mínimo. El oso sale de
/// `assets/brand/ia/bear_<tipo>_<win|retry>.png`.
class ResultCopy {
  const ResultCopy({required this.title, required this.message, required this.bear});

  final String title;
  final String message;

  /// Nombre de la ilustración (sin extensión).
  final String bear;
}

class _Copies {
  const _Copies(this.winTitles, this.winMessages, this.retryTitles, this.retryMessages);

  final List<String> winTitles;
  final List<String> winMessages;
  final List<String> retryTitles;
  final List<String> retryMessages;
}

const _common = _Copies(
  ['¡Muy bien!', '¡Lo lograste!', '¡Excelente trabajo!'],
  ['Cada ejercicio te ayuda a fortalecer tu mente.'],
  ['¡Buen intento!', '¡Vas por buen camino!'],
  ['Cada intento cuenta. Respira y vuelve a probar cuando quieras.'],
);

const _byTheme = <String, _Copies>{
  'atencion': _Copies(
    ['¡Qué concentración!', '¡Muy bien!'],
    [
      'Tu atención estuvo firme de principio a fin.',
      'Observaste con calma y lo notaste todo.',
    ],
    ['¡Buen intento!', 'Casi lo tienes'],
    [
      'Busca un lugar tranquilo, enfoca la mirada y vuelve a intentarlo.',
      'La atención se entrena poco a poco. ¡Otra vez!',
    ],
  ),
  'memoria': _Copies(
    ['¡Gran memoria!', '¡Muy bien!'],
    [
      'Recordaste la secuencia como todo un experto.',
      'Tu memoria se está fortaleciendo cada día.',
    ],
    ['¡Buen intento!', 'Sigue practicando'],
    [
      'Repite la secuencia en voz baja; ayuda a recordarla.',
      'Recordar es un músculo: cada intento lo fortalece.',
    ],
  ),
  'reaccion': _Copies(
    ['¡Qué reflejos!', '¡Rapidísimo!'],
    [
      'Respondiste rápido y con precisión.',
      'Tus reflejos están en muy buena forma.',
    ],
    ['¡Buen intento!', 'Respira y vuelve'],
    [
      'Espera a ver el círculo antes de tocar; la precisión vale más que la prisa.',
      'Relaja la mano y mantén la vista en el centro.',
    ],
  ),
  'palabras': _Copies(
    ['¡Palabra perfecta!', '¡Muy bien!'],
    [
      'Encontraste cada letra en su lugar.',
      'Tu lenguaje está cada vez más ágil.',
    ],
    ['¡Buen intento!', 'Casi completa'],
    [
      'Lee la palabra completa en voz alta antes de elegir la letra.',
      'Tómate tu tiempo: no hay prisa para encontrar cada letra.',
    ],
  ),
  'imagenes': _Copies(
    ['¡Buena memoria visual!', '¡Muy bien!'],
    [
      'Guardaste las imágenes con mucho detalle.',
      'Recordaste lo que viste. ¡Gran trabajo!',
    ],
    ['¡Buen intento!', 'Mira otra vez'],
    [
      'Intenta ponerle un nombre a cada imagen mientras la miras.',
      'Fíjate en un detalle de cada tarjeta; ayuda a recordarla.',
    ],
  ),
  'logica': _Copies(
    ['¡Mente brillante!', '¡Muy bien!'],
    [
      'Pensaste paso a paso y llegaste a la respuesta.',
      'Resolviste los problemas con mucha calma.',
    ],
    ['¡Buen intento!', 'Paso a paso'],
    [
      'Lee el problema dos veces y descarta las opciones que no encajan.',
      'Equivocarse también es aprender. ¡Vuelve a intentarlo!',
    ],
  ),
};

/// [seed] hace variar la frase entre intentos sin ser aleatoria en pruebas.
ResultCopy resultCopy(Exercise exercise, {required bool success, int seed = 0}) {
  final theme = IslandTheme.ofExercise(exercise);
  final copies = _byTheme[theme.key] ?? _common;
  String pick(List<String> list) => list[seed.abs() % list.length];
  final key = _byTheme.containsKey(theme.key) ? theme.key : 'memoria';
  return ResultCopy(
    title: pick(success ? copies.winTitles : copies.retryTitles),
    message: pick(success ? copies.winMessages : copies.retryMessages),
    bear: 'bear_${key}_${success ? 'win' : 'retry'}',
  );
}

/// "1:20" a partir de milisegundos.
String formatDuration(int ms) {
  final total = (ms / 1000).round();
  final minutes = total ~/ 60;
  final seconds = total % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}
