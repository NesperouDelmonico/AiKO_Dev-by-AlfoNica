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

  bool ready = false;
  Map<String, dynamic>? user;

  bool get isAuthenticated => api.token != null && user != null;
  String get firstName {
    final name = (user?['nombre'] as String?)?.trim() ?? '';
    return name.isEmpty ? '' : name.split(' ').first;
  }

  Future<void> restore() async {
    try {
      final saved = await _storage.read(key: _tokenKey);
      if (saved != null) {
        api.token = saved;
        user = Map<String, dynamic>.from(await api.get('/auth/me') as Map);
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
    final data = await api.post('/auth/login', {
      'correo': correo.trim(),
      'contraseña': contrasena,
    }) as Map;
    api.token = data['token'] as String;
    user = Map<String, dynamic>.from(data['usuario'] as Map);
    await _storage.write(key: _tokenKey, value: api.token);
    notifyListeners();
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
