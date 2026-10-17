/// Modelos de la ruta terapéutica del paciente (respuesta de
/// GET /pacientes/:id/rutas/activa) y de su perfil de logros.
class Exercise {
  const Exercise({
    required this.id,
    required this.nombre,
    required this.categoria,
    required this.instrucciones,
    required this.nivel,
  });

  final String id;
  final String nombre;
  final String categoria;
  final String instrucciones;
  final int nivel;

  factory Exercise.fromJson(Map<String, dynamic> json) => Exercise(
        id: json['id'] as String,
        nombre: json['nombre'] as String,
        categoria: json['categoria'] as String,
        instrucciones: (json['instrucciones'] as String?) ?? '',
        nivel: ((json['nivelDificultad'] ?? json['nivel_dificultad']) as num?)
                ?.toInt() ??
            1,
      );
}

class RouteExercise {
  const RouteExercise({
    required this.id,
    required this.orden,
    required this.estado,
    required this.ejercicio,
  });

  static const pending = 'Pendiente';
  static const completed = 'Completado';
  static const replaced = 'Reemplazado';

  final String id;
  final int orden;
  final String estado;
  final Exercise ejercicio;

  bool get isPending => estado == pending;
  bool get isCompleted => estado == completed;

  factory RouteExercise.fromJson(Map<String, dynamic> json) => RouteExercise(
        id: json['id'] as String,
        orden: (json['orden'] as num).toInt(),
        estado: json['estado'] as String,
        ejercicio:
            Exercise.fromJson(Map<String, dynamic>.from(json['ejercicio'] as Map)),
      );
}

class ActiveRoute {
  const ActiveRoute({required this.id, required this.ejercicios});

  final String id;

  /// Ejercicios vigentes, ordenados (los reemplazados no se muestran).
  final List<RouteExercise> ejercicios;

  int get total => ejercicios.length;
  int get done => ejercicios.where((e) => e.isCompleted).length;

  /// Primer ejercicio pendiente, o null si la ruta está completa.
  RouteExercise? get next {
    for (final e in ejercicios) {
      if (e.isPending) return e;
    }
    return null;
  }

  factory ActiveRoute.fromJson(Map<String, dynamic> json) {
    final items = (json['ejercicios'] as List)
        .map((e) => RouteExercise.fromJson(Map<String, dynamic>.from(e as Map)))
        .where((e) => e.estado != RouteExercise.replaced)
        .toList()
      ..sort((a, b) => a.orden.compareTo(b.orden));
    return ActiveRoute(id: json['id'] as String, ejercicios: items);
  }
}

class AchievementProfile {
  const AchievementProfile({required this.nivel, required this.xp});

  final int nivel;
  final int xp;

  factory AchievementProfile.fromJson(Map<String, dynamic> json) =>
      AchievementProfile(
        nivel: (json['nivel_actual'] as num).toInt(),
        xp: (json['xp_total'] as num).toInt(),
      );
}
