import 'package:flutter_test/flutter_test.dart';

import 'package:aiko_mobile/core/validators.dart';

void main() {
  group('Validators.email', () {
    test('acepta un correo válido', () {
      expect(Validators.email('a@b.co'), isNull);
    });
    test('rechaza vacío y mal formado', () {
      expect(Validators.email(''), isNotNull);
      expect(Validators.email('sin-arroba'), isNotNull);
      expect(Validators.email('a@b'), isNotNull);
    });
  });

  group('Validators.newPassword', () {
    test('acepta una contraseña que cumple la política', () {
      expect(Validators.newPassword('Abcdefg1'), isNull);
    });
    test('rechaza cortas o sin mayúscula, minúscula o número', () {
      expect(Validators.newPassword('Ab1'), isNotNull);
      expect(Validators.newPassword('abcdefg1'), isNotNull);
      expect(Validators.newPassword('ABCDEFG1'), isNotNull);
      expect(Validators.newPassword('Abcdefgh'), isNotNull);
    });
  });

  test('Validators.code exige 6 dígitos', () {
    expect(Validators.code('123456'), isNull);
    expect(Validators.code('12345'), isNotNull);
    expect(Validators.code('12345a'), isNotNull);
  });

  test('Validators.sameAs compara con el otro campo', () {
    final validator = Validators.sameAs(() => 'x');
    expect(validator('x'), isNull);
    expect(validator('y'), isNotNull);
  });
}
