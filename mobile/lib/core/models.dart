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
    this.dia = 1,
  });

  static const pending = 'Pendiente';
  static const completed = 'Completado';
  static const replaced = 'Reemplazado';

  final String id;
  final int orden;

  /// Día del plan asignado por el especialista (1, 2, …).
  final int dia;
  final String estado;
  final Exercise ejercicio;

  bool get isPending => estado == pending;
  bool get isCompleted => estado == completed;

  factory RouteExercise.fromJson(Map<String, dynamic> json) => RouteExercise(
        id: json['id'] as String,
        orden: (json['orden'] as num).toInt(),
        dia: (json['dia'] as num?)?.toInt() ?? 1,
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

  /// Ejercicios agrupados por día, en orden. Los días se numeran
  /// consecutivamente (Día 1, Día 2, …) aunque el backend deje huecos.
  List<RouteDay> get days {
    final result = <RouteDay>[];
    int? current;
    for (final item in ejercicios) {
      if (item.dia != current) {
        current = item.dia;
        result.add(RouteDay(numero: result.length + 1, ejercicios: []));
      }
      result.last.ejercicios.add(item);
    }
    return result;
  }

  factory ActiveRoute.fromJson(Map<String, dynamic> json) {
    final items = (json['ejercicios'] as List)
        .map((e) => RouteExercise.fromJson(Map<String, dynamic>.from(e as Map)))
        .where((e) => e.estado != RouteExercise.replaced)
        .toList()
      ..sort((a, b) {
        final byDay = a.dia.compareTo(b.dia);
        return byDay != 0 ? byDay : a.orden.compareTo(b.orden);
      });
    return ActiveRoute(id: json['id'] as String, ejercicios: items);
  }
}

class RouteDay {
  RouteDay({required this.numero, required this.ejercicios});

  final int numero;
  final List<RouteExercise> ejercicios;

  int get total => ejercicios.length;
  int get done => ejercicios.where((e) => e.isCompleted).length;
  bool get isComplete => done == total;
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
