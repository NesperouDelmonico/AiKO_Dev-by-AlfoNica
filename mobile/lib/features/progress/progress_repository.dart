import '../../core/api_client.dart';

/// XP por nivel (XP_PER_LEVEL del backend; nivel = xp ~/ 100 + 1).
const xpPerLevel = 100;

/// Avance dentro del nivel actual (0–1) y XP que faltan para el siguiente.
({double progress, int remaining}) levelProgress(int xp) {
  final inLevel = xp % xpPerLevel;
  return (progress: inLevel / xpPerLevel, remaining: xpPerLevel - inLevel);
}

class AikoBadge {
  const AikoBadge({required this.id, required this.nombre, required this.descripcion});

  final String id;
  final String nombre;
  final String descripcion;

  factory AikoBadge.fromJson(Map<String, dynamic> json) => AikoBadge(
        id: (json['id'] as String?) ?? (json['nombre'] as String? ?? ''),
        nombre: (json['nombre'] as String?) ?? 'Insignia',
        descripcion: (json['descripcion'] as String?) ?? '',
      );
}

class DomainProgress {
  const DomainProgress({required this.categoria, required this.porcentaje});

  final String categoria;
  final double porcentaje;

  factory DomainProgress.fromJson(Map<String, dynamic> json) => DomainProgress(
        categoria: json['categoria'] as String,
        porcentaje: (json['porcentaje'] as num?)?.toDouble() ?? 0,
      );
}

class SeriesPoint {
  const SeriesPoint(this.fecha, this.valor);

  final String fecha;
  final double valor;
}

class Attempt {
  const Attempt({
    required this.nombre,
    required this.categoria,
    required this.puntaje,
    required this.fecha,
    this.tiempoMs,
    this.xp = 0,
  });

  final String nombre;
  final String? categoria;
  final int puntaje;
  final DateTime? fecha;
  final int? tiempoMs;
  final int xp;

  bool get passed => puntaje >= 60;

  factory Attempt.fromJson(Map<String, dynamic> json) => Attempt(
        nombre: (json['ejercicio_nombre'] as String?) ?? 'Ejercicio',
        categoria: json['categoria'] as String?,
        puntaje: (json['puntaje'] as num?)?.toInt() ?? 0,
        fecha: DateTime.tryParse('${json['fecha']}')?.toLocal(),
        tiempoMs: ((json['tiempo_reaccion_ms'] ?? json['tiempoReaccionMs']) as num?)?.toInt(),
        xp: ((json['xp_ganado'] ?? json['xpGanado']) as num?)?.toInt() ?? 0,
      );
}

class AttemptPage {
  const AttemptPage({required this.items, required this.total});

  final List<Attempt> items;
  final int total;
}

/// GET /pacientes/:id/constancia?mes=YYYY-MM
class Consistency {
  const Consistency({
    required this.mes,
    required this.hoy,
    required this.diasActivos,
    required this.rachaActual,
    required this.mejorRacha,
    required this.ejerciciosSemana,
  });

  /// YYYY-MM.
  final String mes;

  /// YYYY-MM-DD (Colombia).
  final String hoy;
  final Set<String> diasActivos;
  final int rachaActual;
  final int mejorRacha;
  final int ejerciciosSemana;

  factory Consistency.fromJson(Map<String, dynamic> json) => Consistency(
        mes: '${json['mes']}',
        hoy: '${json['hoy']}',
        diasActivos: ((json['dias_activos'] as List?) ?? const []).map((d) => '$d').toSet(),
        rachaActual: (json['racha_actual'] as num?)?.toInt() ?? 0,
        mejorRacha: (json['mejor_racha'] as num?)?.toInt() ?? 0,
        ejerciciosSemana: (json['ejercicios_semana'] as num?)?.toInt() ?? 0,
      );
}

class ProgressData {
  const ProgressData({
    required this.nivel,
    required this.xp,
    required this.earned,
    required this.catalog,
    required this.domains,
    required this.series,
    required this.history,
    this.consistency,
  });

  final int nivel;
  final int xp;

  /// Nombres de las insignias obtenidas.
  final Set<String> earned;
  final List<AikoBadge> catalog;
  final List<DomainProgress> domains;
  final List<SeriesPoint> series;
  final AttemptPage history;

  /// Null si el servidor aún no tiene el calendario de constancia.
  final Consistency? consistency;
}

class ProgressRepository {
  ProgressRepository(this._api);

  final ApiClient _api;

  static const pageSize = 10;

  Future<ProgressData> load(String? pacienteId) async {
    if (pacienteId == null) {
      throw ApiException(0, 'Tu cuenta no tiene un perfil de paciente asociado.');
    }
    final base = '/pacientes/$pacienteId';
    final results = await Future.wait<dynamic>([
      _api.get('$base/perfil-logros'),
      _api.get('/insignias').catchError((_) => const <dynamic>[]),
      _api.get('$base/progreso/dominio'),
      _api.get('$base/progreso/temporal'),
      history(pacienteId, 1),
      consistency(pacienteId).then<Consistency?>((c) => c, onError: (_) => null),
    ]);
    final profile = Map<String, dynamic>.from(results[0] as Map);
    final earned = ((profile['insignias'] as List?) ?? const [])
        .whereType<Map>()
        .map((b) => b['nombre'])
        .whereType<String>()
        .toSet();
    final catalog = ((results[1] as List?) ?? const [])
        .whereType<Map>()
        .map((b) => AikoBadge.fromJson(Map<String, dynamic>.from(b)))
        .toList();
    // Las obtenidas que no estén en el catálogo también se muestran.
    for (final name in earned) {
      if (!catalog.any((b) => b.nombre == name)) {
        catalog.add(AikoBadge(id: name, nombre: name, descripcion: ''));
      }
    }
    final temporal = results[3] is Map ? Map<String, dynamic>.from(results[3] as Map) : const {};
    return ProgressData(
      nivel: (profile['nivel_actual'] as num?)?.toInt() ?? 1,
      xp: (profile['xp_total'] as num?)?.toInt() ?? 0,
      earned: earned,
      catalog: catalog,
      domains: ((results[2] as List?) ?? const [])
          .whereType<Map>()
          .map((d) => DomainProgress.fromJson(Map<String, dynamic>.from(d)))
          .toList(),
      series: ((temporal['serie'] as List?) ?? const [])
          .whereType<Map>()
          .map((p) => SeriesPoint('${p['fecha']}', (p['valor'] as num?)?.toDouble() ?? 0))
          .toList(),
      history: results[4] as AttemptPage,
      consistency: results[5] as Consistency?,
    );
  }

  Future<Consistency> consistency(String pacienteId, [String? mes]) async {
    final query = mes == null ? '' : '?mes=$mes';
    final data = await _api.get('/pacientes/$pacienteId/constancia$query');
    return Consistency.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<AttemptPage> history(String pacienteId, int page) async {
    final data = await _api
        .get('/pacientes/$pacienteId/historial?page=$page&limit=$pageSize');
    final json = Map<String, dynamic>.from(data as Map);
    return AttemptPage(
      items: ((json['data'] as List?) ?? const [])
          .whereType<Map>()
          .map((a) => Attempt.fromJson(Map<String, dynamic>.from(a)))
          .toList(),
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }
}
