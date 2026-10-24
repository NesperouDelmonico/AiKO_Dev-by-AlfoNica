import '../../core/api_client.dart';
import '../../core/models.dart';

class HomeData {
  const HomeData({required this.route, required this.profile});

  /// Null cuando el paciente aún no tiene una ruta activa.
  final ActiveRoute? route;
  final AchievementProfile profile;
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
    ]);
    return HomeData(
      route: results[0] as ActiveRoute?,
      profile: results[1] as AchievementProfile,
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

  Future<AchievementProfile> _profile(String pacienteId) async {
    final data = await _api.get('/pacientes/$pacienteId/perfil-logros');
    return AchievementProfile.fromJson(Map<String, dynamic>.from(data as Map));
  }
}
