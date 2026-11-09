import 'dart:typed_data';

/// Lo que devuelve un mini-juego al terminar; se envía tal cual a
/// POST /rutas/:rutaId/ejercicios/:rutaEjercicioId/resultados.
class GameOutcome {
  const GameOutcome({
    required this.puntaje,
    required this.aciertos,
    required this.intentos,
    this.tiempoReaccionMs,
    this.duracionMs,
    this.dibujos = const [],
  });

  /// 0–100.
  final int puntaje;
  final int aciertos;
  final int intentos;

  /// Promedio de los aciertos; null si no hubo ninguno.
  final int? tiempoReaccionMs;

  /// Duración total del ejercicio (solo se muestra; no se envía).
  final int? duracionMs;

  /// Dibujos del paciente en PNG (Recordar imágenes); se suben a
  /// POST /imagenes y el especialista los revisa.
  final List<Uint8List> dibujos;

  GameOutcome withDuration(int ms) => GameOutcome(
        puntaje: puntaje,
        aciertos: aciertos,
        intentos: intentos,
        tiempoReaccionMs: tiempoReaccionMs,
        duracionMs: ms,
        dibujos: dibujos,
      );

  /// Puntaje = porcentaje de aciertos; tiempo = promedio de los aciertos.
  factory GameOutcome.fromReactions({
    required int intentos,
    required List<int> tiemposAciertoMs,
  }) {
    final aciertos = tiemposAciertoMs.length;
    final puntaje =
        intentos == 0 ? 0 : ((aciertos * 100) / intentos).round().clamp(0, 100);
    final promedio = aciertos == 0
        ? null
        : (tiemposAciertoMs.reduce((a, b) => a + b) / aciertos).round();
    return GameOutcome(
      puntaje: puntaje,
      aciertos: aciertos,
      intentos: intentos,
      tiempoReaccionMs: promedio,
    );
  }

  /// [dibujoIds]: ids de los dibujos ya subidos.
  Map<String, dynamic> toJson({List<String> dibujoIds = const []}) => {
        'puntaje': puntaje,
        'aciertos': aciertos,
        if (tiempoReaccionMs != null) 'tiempo_reaccion_ms': tiempoReaccionMs,
        if (dibujoIds.isNotEmpty) 'dibujos': dibujoIds,
      };
}
