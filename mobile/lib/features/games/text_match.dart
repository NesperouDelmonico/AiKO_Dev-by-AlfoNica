/// Comparación de texto tolerante para respuestas escritas por el paciente:
/// sin tildes, sin mayúsculas, sin signos y con espacios normalizados.
String normalizeAnswer(String text) {
  const from = 'áàäâãéèëêíìïîóòöôõúùüûñç';
  const to = 'aaaaaeeeeiiiiooooouuuunc';
  final buffer = StringBuffer();
  for (final rune in text.toLowerCase().runes) {
    final char = String.fromCharCode(rune);
    final index = from.indexOf(char);
    buffer.write(index >= 0 ? to[index] : char);
  }
  return buffer
      .toString()
      .replaceAll(RegExp(r'[^a-z0-9 ]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

/// Acierta si la respuesta contiene alguna palabra clave completa
/// ("un perro grande" contiene "perro"; "perrera" no).
bool matchesAnyKeyword(String answer, List<String> keywords) {
  final normalized = ' ${normalizeAnswer(answer)} ';
  if (normalized.trim().isEmpty) return false;
  return keywords
      .map(normalizeAnswer)
      .where((keyword) => keyword.isNotEmpty)
      .any((keyword) => normalized.contains(' $keyword '));
}
