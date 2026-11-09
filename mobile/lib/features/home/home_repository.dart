import '../../core/api_client.dart';
import '../../core/models.dart';

class HomeData {
  const HomeData({required this.route, required this.profile, this.streak});

  /// Null cuando el paciente aún no tiene una ruta activa.
  final ActiveRoute? route;
  final AchievementProfile profile;

  /// Días seguidos con práctica (null si el servidor no lo informa).
  final int? streak;
}

class HomeRepository {
  HomeRepository(this._api);

  final ApiClient _api;

  Future<HomeData> load(String? pacienteId) async {
    if (pacienteId == null) {
      throw ApiException(0, 'Tu cuenta no tiene un perfil de paciente asociado.');
    }
    final results = await Future.wait<Object?>([
      _route(pacienteId),
      _profile(pacienteId),
      _streak(pacienteId),
    ]);
    return HomeData(
      route: results[0] as ActiveRoute?,
      profile: results[1] as AchievementProfile,
      streak: results[2] as int?,
    );
  }

  Future<ActiveRoute?> _route(String pacienteId) async {
    try {
      final data = await _api.get('/pacientes/$pacienteId/rutas/activa');
      return ActiveRoute.fromJson(Map<String, dynamic>.from(data as Map));
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null; // "Sin ruta activa"
      rethrow;
    }
  }

  Future<int?> _streak(String pacienteId) async {
    try {
      final data = await _api.get('/pacientes/$pacienteId/constancia');
      return ((data as Map)['racha_actual'] as num?)?.toInt();
    } on Object {
      return null; // La racha es opcional: no bloquea el Inicio.
    }
  }

  Future<AchievementProfile> _profile(String pacienteId) async {
    final data = await _api.get('/pacientes/$pacienteId/perfil-logros');
    return AchievementProfile.fromJson(Map<String, dynamic>.from(data as Map));
  }
}
