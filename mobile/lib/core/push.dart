import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'api_client.dart';
import 'session.dart';

/// Notificaciones push (Firebase Cloud Messaging).
///
/// Si el APK se compiló sin `google-services.json`, Firebase no arranca y la
/// app sigue funcionando sin push. Con sesión de paciente registra el token
/// en `POST /pacientes/:id/dispositivos`; con la app abierta muestra el
/// aviso como un mensaje en pantalla.
class PushService {
  PushService(this._session, this._messenger);

  final Session _session;
  final GlobalKey<ScaffoldMessengerState> _messenger;
  bool _ready = false;
  String? _registeredFor;
  StreamSubscription<String>? _refresh;
  StreamSubscription<RemoteMessage>? _foreground;

  Future<bool> _init() async {
    if (_ready) return true;
    try {
      await Firebase.initializeApp();
      _ready = true;
    } catch (error) {
      debugPrint('Push desactivado: $error');
    }
    return _ready;
  }

  /// Llamar cuando hay sesión de paciente.
  Future<void> start() async {
    final patientId = _session.pacienteId;
    if (patientId == null || _registeredFor == patientId) return;
    if (!await _init()) return;
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      await _register(patientId, await messaging.getToken());
      _registeredFor = patientId;
      await _refresh?.cancel();
      _refresh = messaging.onTokenRefresh.listen((token) => _register(patientId, token));
      await _foreground?.cancel();
      _foreground = FirebaseMessaging.onMessage.listen(_showInApp);
    } catch (error) {
      debugPrint('No se pudo activar el push: $error');
    }
  }

  /// Al cerrar sesión: este teléfono deja de recibir avisos del paciente.
  Future<void> stop() async {
    _registeredFor = null;
    await _refresh?.cancel();
    await _foreground?.cancel();
    _refresh = null;
    _foreground = null;
    if (!_ready) return;
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (error) {
      debugPrint('No se pudo borrar el token push: $error');
    }
  }

  Future<void> _register(String patientId, String? token) async {
    if (token == null || token.isEmpty) return;
    try {
      await _session.api.post('/pacientes/$patientId/dispositivos', {'token': token});
    } on ApiException catch (error) {
      debugPrint('No se registró el dispositivo: ${error.message}');
    }
  }

  void _showInApp(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;
    final title = notification.title ?? 'AiKO';
    final body = notification.body ?? '';
    _messenger.currentState?.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 6),
        content: Row(
          children: [
            const Icon(Icons.notifications_active_rounded, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
                  if (body.isNotEmpty) Text(body),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
