import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:aiko_mobile/core/api_client.dart';
import 'package:aiko_mobile/core/session.dart';

http.Response _json(Object body, [int status = 200]) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Map<String, dynamic> _user(String rol) => {
      'id': 'u1',
      'nombre': 'Ana Perez',
      'correo': 'ana@example.com',
      'rol': rol,
    };

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  test('login de paciente deja la sesión iniciada', () async {
    final client = MockClient((request) async {
      expect(request.url.path, endsWith('/auth/login'));
      return _json({'token': 't', 'rol': 'Paciente', 'usuario': _user('Paciente')});
    });
    final session = Session(ApiClient(client: client));
    await session.login('ana@example.com', 'Abcdefg1');
    expect(session.isAuthenticated, isTrue);
    expect(session.firstName, 'Ana');
  });

  test('login de otro rol se rechaza y revoca el token', () async {
    final paths = <String>[];
    final client = MockClient((request) async {
      paths.add(request.url.path);
      if (request.url.path.endsWith('/auth/login')) {
        return _json({'token': 't', 'rol': 'Administrador', 'usuario': _user('Administrador')});
      }
      return http.Response('', 204);
    });
    final api = ApiClient(client: client);
    final session = Session(api);
    await expectLater(
      session.login('a@b.co', 'Abcdefg1'),
      throwsA(isA<ApiException>()),
    );
    expect(session.isAuthenticated, isFalse);
    expect(api.token, isNull);
    expect(paths.any((p) => p.endsWith('/auth/logout')), isTrue);
  });

  test('un 401 con sesión activa expira la sesión', () async {
    final client = MockClient((request) async {
      if (request.url.path.endsWith('/auth/login')) {
        return _json({'token': 't', 'rol': 'Paciente', 'usuario': _user('Paciente')});
      }
      return _json({'message': 'x'}, 401);
    });
    final api = ApiClient(client: client);
    final session = Session(api);
    await session.login('ana@example.com', 'Abcdefg1');
    await expectLater(api.get('/auth/me'), throwsA(isA<ApiException>()));
    expect(session.isAuthenticated, isFalse);
    expect(session.notice, isNotNull);
  });

  test('contraseña actual incorrecta no cierra la sesión', () async {
    final client = MockClient((request) async {
      if (request.url.path.endsWith('/auth/login')) {
        return _json({'token': 't', 'rol': 'Paciente', 'usuario': _user('Paciente')});
      }
      return _json({'message': 'Contraseña actual incorrecta'}, 401);
    });
    final session = Session(ApiClient(client: client));
    await session.login('ana@example.com', 'Abcdefg1');
    await expectLater(
      session.changePassword('mala', 'Abcdefg2'),
      throwsA(isA<ApiException>()),
    );
    expect(session.isAuthenticated, isTrue);
  });
}
