import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Tamaños de letra que puede elegir el paciente.
enum TextSizeOption {
  normal(1.0, 'Normal'),
  large(1.15, 'Grande'),
  extraLarge(1.3, 'Muy grande');

  const TextSizeOption(this.scale, this.label);
  final double scale;
  final String label;
}

/// Preferencias de accesibilidad guardadas en el teléfono.
class AppSettings extends ChangeNotifier {
  AppSettings({SharedPreferences? prefs}) : _prefs = prefs;

  static const _textSizeKey = 'aiko.textSize';
  static const _reduceMotionKey = 'aiko.reduceMotion';

  SharedPreferences? _prefs;
  TextSizeOption _textSize = TextSizeOption.normal;
  bool _reduceMotion = false;

  TextSizeOption get textSize => _textSize;
  bool get reduceMotion => _reduceMotion;

  Future<void> load() async {
    try {
      _prefs ??= await SharedPreferences.getInstance();
      final name = _prefs!.getString(_textSizeKey);
      _textSize = TextSizeOption.values.firstWhere(
        (option) => option.name == name,
        orElse: () => TextSizeOption.normal,
      );
      _reduceMotion = _prefs!.getBool(_reduceMotionKey) ?? false;
      notifyListeners();
    } catch (_) {
      // Sin almacenamiento se usan los valores por defecto.
    }
  }

  Future<void> setTextSize(TextSizeOption option) async {
    _textSize = option;
    notifyListeners();
    await _prefs?.setString(_textSizeKey, option.name);
  }

  Future<void> setReduceMotion(bool value) async {
    _reduceMotion = value;
    notifyListeners();
    await _prefs?.setBool(_reduceMotionKey, value);
  }
}
