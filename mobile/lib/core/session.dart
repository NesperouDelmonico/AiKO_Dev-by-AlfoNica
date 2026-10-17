import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_client.dart';

/// Estado de sesión: guarda el JWT en almacenamiento seguro del dispositivo.
class Session extends ChangeNotifier {
  Session(this.api, {FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _tokenKey = 'aiko_token';

  final ApiClient api;
  final FlutterSecureStorage _storage;

  static const patientRole = 'Paciente';

  bool ready = false;
  Map<String, dynamic>? user;

  /// Mensaje para mostrar en el login (p. ej. sesión vencida).
  String? notice;

  bool get isAuthenticated => api.token != null && user != null;
  String get firstName {
    final name = (user?['nombre'] as String?)?.trim() ?? '';
    return name.isEmpty ? '' : name.split(' ').first;
  }

  void _bind() => api.onSessionExpired = expire;

  Future<void> restore() async {
    _bind();
    try {
      final saved = await _storage.read(key: _tokenKey);
      if (saved != null) {
        api.token = saved;
        user = Map<String, dynamic>.from(await api.get('/auth/me') as Map);
        if (user!['rol'] != patientRole) {
          api.token = null;
          user = null;
          await _storage.delete(key: _tokenKey);
        }
      }
    } on ApiException catch (e) {
      // 401: el token venció o fue revocado. Sin red: se pide iniciar sesión de nuevo.
      api.token = null;
      user = null;
      if (e.statusCode == 401) await _storage.delete(key: _tokenKey);
    } catch (_) {
      api.token = null;
      user = null;
    }
    ready = true;
    notifyListeners();
  }

  Future<void> login(String correo, String contrasena) async {
    _bind();
    notice = null;
    final data = await api.post('/auth/login', {
      'correo': correo.trim(),
      'contraseña': contrasena,
    }, false) as Map;
    final role = data['rol'] as String?;
    if (role != patientRole) {
      // Cuenta válida pero de otro rol: se revoca el token recién emitido.
      api.token = data['token'] as String;
      try {
        await api.post('/auth/logout', null, false);
      } on ApiException {
        // Ignorar: el token vence solo.
      }
      api.token = null;
      throw ApiException(
          403, 'Esta aplicación es solo para pacientes. Usa el panel web.');
    }
    api.token = data['token'] as String;
    user = Map<String, dynamic>.from(data['usuario'] as Map);
    await _storage.write(key: _tokenKey, value: api.token);
    notifyListeners();
  }

  /// Sesión vencida o revocada: vuelve al login con un aviso.
  void expire() {
    if (api.token == null) return;
    api.token = null;
    user = null;
    notice = 'Tu sesión venció. Inicia sesión de nuevo.';
    _storage.delete(key: _tokenKey);
    notifyListeners();
  }

  Future<void> requestPasswordReset(String correo) =>
      api.post('/auth/olvide-contrasena', {'correo': correo.trim()}, false);

  Future<void> resetPassword({
    required String correo,
    required String codigo,
    required String nuevaContrasena,
  }) =>
      api.post('/auth/restablecer-contrasena', {
        'correo': correo.trim(),
        'codigo': codigo.trim(),
        'nueva_contraseña': nuevaContrasena,
      }, false);

  Future<void> changePassword(String actual, String nueva) async {
    try {
      await api.patch('/auth/contrasena', {
        'contraseña_actual': actual,
        'nueva_contraseña': nueva,
      }, expireSessionOn401: false);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        throw ApiException(401, 'La contraseña actual no es correcta.');
      }
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await api.post('/auth/logout');
    } on ApiException {
      // Si falla, igual se cierra la sesión localmente.
    }
    api.token = null;
    user = null;
    await _storage.delete(key: _tokenKey);
    notifyListeners();
  }
}
