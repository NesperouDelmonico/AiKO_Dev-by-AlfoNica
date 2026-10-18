/// Modelos de la ruta terapéutica del paciente (respuesta de
/// GET /pacientes/:id/rutas/activa) y de su perfil de logros.
class Exercise {
  const Exercise({
    required this.id,
    required this.nombre,
    required this.categoria,
    required this.instrucciones,
    required this.nivel,
    this.tipo = '',
    this.parametros = const {},
  });

  /// Tipos de juego (campo `tipo` del backend).
  static const reaction = 'reaccion';
  static const completeWords = 'completar_palabras';
  static const rememberImages = 'recordar_imagenes';
  static const logic = 'logica';

  final String id;
  final String nombre;
  final String categoria;

  /// Mini-juego; los ejercicios antiguos sin tipo se deducen de la categoría.
  final String tipo;
  final String instrucciones;
  final int nivel;

  /// Parámetros del mini-juego (ver EXERCISE_PARAMETERS en el backend).
  final Map<String, dynamic> parametros;

  /// Lee un parámetro entero con valor por defecto.
  int param(String key, int fallback) =>
      (parametros[key] as num?)?.toInt() ?? fallback;

  String? paramString(String key) {
    final value = parametros[key];
    return value is String && value.isNotEmpty ? value : null;
  }

  /// Lista de objetos (p. ej. `imagenes` o `preguntas`).
  List<Map<String, dynamic>> paramObjects(String key) {
    final value = parametros[key];
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  static String _defaultType(String categoria) => switch (categoria) {
        'Velocidad' => reaction,
        'Memoria' => 'memoria_secuencias',
        _ => 'atencion_sostenida',
      };

  factory Exercise.fromJson(Map<String, dynamic> json) => Exercise(
        id: json['id'] as String,
        nombre: json['nombre'] as String,
        categoria: json['categoria'] as String,
        tipo: (json['tipo'] as String?) ??
            _defaultType(json['categoria'] as String),
        instrucciones: (json['instrucciones'] as String?) ?? '',
        nivel: ((json['nivelDificultad'] ?? json['nivel_dificultad']) as num?)
                ?.toInt() ??
            1,
        parametros: json['parametros'] is Map
            ? Map<String, dynamic>.from(json['parametros'] as Map)
            : const {},
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

/// Día habilitado de la ruta (los días se habilitan uno por fecha).
class RouteAgenda {
  const RouteAgenda({
    this.diaActual = 1,
    this.disponible = true,
    this.disponibleDesde,
    this.duracionDias,
  });

  final int diaActual;
  final bool disponible;

  /// YYYY-MM-DD (hora Colombia) en que se habilita el día actual.
  final String? disponibleDesde;
  final int? duracionDias;

  /// ¿Se puede jugar hoy un ejercicio de este día?
  bool isPlayable(int dia) => dia == diaActual && disponible;

  /// ¿Este día aún no se puede jugar?
  bool isLocked(int dia) => dia > diaActual || (dia == diaActual && !disponible);

  factory RouteAgenda.fromJson(Map<String, dynamic>? json) => json == null
      ? const RouteAgenda()
      : RouteAgenda(
          diaActual: (json['dia_actual'] as num?)?.toInt() ?? 1,
          disponible: (json['disponible'] as bool?) ?? true,
          disponibleDesde: json['disponible_desde'] as String?,
          duracionDias: (json['duracion_dias'] as num?)?.toInt(),
        );
}

class ActiveRoute {
  const ActiveRoute({
    required this.id,
    required this.ejercicios,
    this.agenda = const RouteAgenda(),
  });

  final String id;
  final RouteAgenda agenda;

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
        result.add(RouteDay(
            numero: result.length + 1, dia: item.dia, ejercicios: []));
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
    return ActiveRoute(
      id: json['id'] as String,
      ejercicios: items,
      agenda: RouteAgenda.fromJson(json['agenda'] is Map
          ? Map<String, dynamic>.from(json['agenda'] as Map)
          : null),
    );
  }
}

class RouteDay {
  RouteDay({required this.numero, required this.ejercicios, int? dia})
      : dia = dia ?? numero;

  /// Número que se muestra (consecutivo).
  final int numero;

  /// Valor de `dia` en el backend (para la agenda).
  final int dia;
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
