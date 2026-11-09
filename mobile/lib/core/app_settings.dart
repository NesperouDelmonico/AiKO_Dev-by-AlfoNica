import 'package:flutter/material.dart';
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

/// Accesorio del osito (se compran en la tienda; el servidor guarda cuál
/// lleva puesto). Los nombres coinciden con el backend.
enum AikoAccessory {
  base('Sin accesorio'),
  gorra('Gorra'),
  gafas('Gafas'),
  audifonos('Audífonos'),
  mono('Moño'),
  gorro('Gorro de lana'),
  bufanda('Bufanda'),
  corona('Corona');

  const AikoAccessory(this.label);
  final String label;

  static AikoAccessory parse(String? name) =>
      values.firstWhere((a) => a.name == name, orElse: () => AikoAccessory.base);
}

/// "YYYY-MM-DD" del día local.
String localDay([DateTime? now]) {
  final d = now ?? DateTime.now();
  return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

/// Preferencias guardadas en el teléfono: accesibilidad, oso y avisos del
/// compañero.
class AppSettings extends ChangeNotifier {
  AppSettings({SharedPreferences? prefs}) : _prefs = prefs;

  static const _textSizeKey = 'aiko.textSize';
  static const _reduceMotionKey = 'aiko.reduceMotion';
  static const _accessoryKey = 'aiko.accessory';
  static const _greetedKey = 'aiko.greetedOn';
  static const _restKey = 'aiko.restShownOn';
  static const _themeKey = 'aiko.themeMode';

  SharedPreferences? _prefs;
  TextSizeOption _textSize = TextSizeOption.normal;
  bool _reduceMotion = false;
  AikoAccessory _accessory = AikoAccessory.base;
  String? _greetedOn;
  String? _restShownOn;
  ThemeMode _themeMode = ThemeMode.system;

  TextSizeOption get textSize => _textSize;

  /// Modo noche: automático (el del teléfono), claro u oscuro.
  ThemeMode get themeMode => _themeMode;
  bool get reduceMotion => _reduceMotion;
  AikoAccessory get accessory => _accessory;

  /// ¿Ya saludó el compañero hoy?
  bool greetedToday([DateTime? now]) => _greetedOn == localDay(now);

  /// ¿Ya se mostró hoy el aviso de descanso?
  bool restShownToday([DateTime? now]) => _restShownOn == localDay(now);

  Future<void> load() async {
    try {
      _prefs ??= await SharedPreferences.getInstance();
      final name = _prefs!.getString(_textSizeKey);
      _textSize = TextSizeOption.values.firstWhere(
        (option) => option.name == name,
        orElse: () => TextSizeOption.normal,
      );
      _reduceMotion = _prefs!.getBool(_reduceMotionKey) ?? false;
      _accessory = AikoAccessory.parse(_prefs!.getString(_accessoryKey));
      _greetedOn = _prefs!.getString(_greetedKey);
      _restShownOn = _prefs!.getString(_restKey);
      _themeMode = ThemeMode.values.firstWhere(
        (mode) => mode.name == _prefs!.getString(_themeKey),
        orElse: () => ThemeMode.system,
      );
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

  Future<void> setThemeMode(ThemeMode value) async {
    _themeMode = value;
    notifyListeners();
    await _prefs?.setString(_themeKey, value.name);
  }

  Future<void> setAccessory(AikoAccessory value) async {
    _accessory = value;
    notifyListeners();
    await _prefs?.setString(_accessoryKey, value.name);
  }

  Future<void> markGreeted([DateTime? now]) async {
    _greetedOn = localDay(now);
    await _prefs?.setString(_greetedKey, _greetedOn!);
  }

  Future<void> markRestShown([DateTime? now]) async {
    _restShownOn = localDay(now);
    await _prefs?.setString(_restKey, _restShownOn!);
  }
}
