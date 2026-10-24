/// Validaciones de formulario. La política de contraseña replica la del backend
/// (8-72 caracteres, con minúscula, mayúscula y número).
class Validators {
  static String? email(String? v) {
    final value = v?.trim() ?? '';
    if (value.isEmpty) return 'Escribe tu correo';
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)) {
      return 'Escribe un correo válido';
    }
    return null;
  }

  static String? newPassword(String? v) {
    final value = v ?? '';
    if (value.length < 8) return 'Mínimo 8 caracteres';
    if (value.length > 72) return 'Máximo 72 caracteres';
    if (!RegExp(r'[a-z]').hasMatch(value) ||
        !RegExp(r'[A-Z]').hasMatch(value) ||
        !RegExp(r'\d').hasMatch(value)) {
      return 'Debe incluir minúscula, mayúscula y número';
    }
    return null;
  }

  static String? Function(String?) sameAs(String Function() other) =>
      (v) => v == other() ? null : 'Las contraseñas no coinciden';

  static String? code(String? v) {
    if (!RegExp(r'^\d{6}$').hasMatch(v?.trim() ?? '')) {
      return 'El código tiene 6 dígitos';
    }
    return null;
  }
}
