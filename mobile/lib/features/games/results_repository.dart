import '../../core/api_client.dart';
import 'game_outcome.dart';

class SubmitResult {
  const SubmitResult({
    required this.advanced,
    required this.xpGanado,
    required this.mensaje,
    this.insignias = const [],
  });

  /// true si alcanzó el puntaje mínimo y el ejercicio quedó completado.
  final bool advanced;
  final int xpGanado;
  final String mensaje;
  final List<String> insignias;
}

class ResultsRepository {
  ResultsRepository(this._api);

  final ApiClient _api;

  Future<SubmitResult> submit({
    required String routeId,
    required String routeExerciseId,
    required GameOutcome outcome,
  }) async {
    try {
      final data = await _api.post(
        '/rutas/$routeId/ejercicios/$routeExerciseId/resultados',
        outcome.toJson(),
      );
      final json = Map<String, dynamic>.from(data as Map);
      return SubmitResult(
        advanced: true,
        xpGanado: ((json['xpGanado'] ?? json['xp_ganado']) as num?)?.toInt() ?? 0,
        mensaje: (json['retroalimentacion'] as String?) ??
            'Sesión registrada. ¡Buen trabajo!',
        insignias: _badgeNames(json['insignias_obtenidas']),
      );
    } on ApiException catch (e) {
      // El backend guarda el intento pero responde 403 si no llegó al mínimo.
      if (e.statusCode == 403 && e.message.contains('Puntaje mínimo')) {
        return const SubmitResult(
          advanced: false,
          xpGanado: 0,
          mensaje: 'Tu intento quedó guardado. Necesitas al menos 60 % '
              'para avanzar. ¡Puedes intentarlo otra vez!',
        );
      }
      rethrow;
    }
  }

  static List<String> _badgeNames(Object? raw) {
    if (raw is! List) return const [];
    return raw
        .map((b) => b is Map ? (b['nombre'] as String?) : null)
        .whereType<String>()
        .toList();
  }
}
