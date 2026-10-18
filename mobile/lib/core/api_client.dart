import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  String? token;

  /// Se llama cuando una petición autenticada recibe 401 (token vencido o
  /// revocado). No se llama en peticiones con `expireSessionOn401: false`
  /// (login, cambio de contraseña), donde un 401 significa "credencial mala".
  void Function()? onSessionExpired;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Uri _uri(String path) => Uri.parse('${AppConfig.apiBaseUrl}$path');

  Future<dynamic> get(String path) =>
      _send(() => _client.get(_uri(path), headers: _headers));

  Future<dynamic> post(
    String path, [
    Map<String, dynamic>? body,
    bool expireSessionOn401 = true,
  ]) =>
      _send(
        () => _client.post(_uri(path),
            headers: _headers, body: jsonEncode(body ?? {})),
        expireSessionOn401,
      );

  Future<dynamic> patch(
    String path,
    Map<String, dynamic> body, {
    bool expireSessionOn401 = true,
  }) =>
      _send(
        () => _client.patch(_uri(path),
            headers: _headers, body: jsonEncode(body)),
        expireSessionOn401,
      );

  Future<dynamic> _send(
    Future<http.Response> Function() request, [
    bool expireSessionOn401 = true,
  ]) async {
    final hadToken = token != null;
    final http.Response response;
    try {
      response = await request().timeout(const Duration(seconds: 25));
    } on TimeoutException {
      throw ApiException(0, 'El servidor tardó demasiado en responder.');
    } on http.ClientException {
      throw ApiException(0, 'No hay conexión con el servidor.');
    }
    final decoded = response.body.isEmpty ? null : _tryDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) return decoded;
    if (response.statusCode == 401 && hadToken && expireSessionOn401) {
      onSessionExpired?.call();
    }
    throw ApiException(
        response.statusCode, _messageFor(response.statusCode, decoded));
  }

  dynamic _tryDecode(String body) {
    try {
      return jsonDecode(body);
    } on FormatException {
      return null;
    }
  }

  String _messageFor(int status, dynamic body) {
    switch (status) {
      case 401:
        return 'Correo o contraseña incorrectos.';
      case 423:
        return 'La cuenta está bloqueada por demasiados intentos.';
      case 429:
        return 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
    }
    if (body is Map && body['message'] != null) {
      final m = body['message'];
      return m is List ? m.join('\n') : m.toString();
    }
    return 'Ocurrió un error inesperado ($status).';
  }
}
