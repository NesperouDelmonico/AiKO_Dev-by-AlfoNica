import 'package:flutter/material.dart';

/// Paleta lila–durazno. Los textos usan un violeta muy oscuro para mantener
/// buen contraste; los colores claros se reservan para fondos y acentos.
class AikoColors {
  static const lilac = Color(0xFFB9A6F0);
  static const lilacSoft = Color(0xFFE9E1FF);
  static const lavenderBg = Color(0xFFF6F2FF);
  static const violet = Color(0xFF5B3FA8);
  static const ink = Color(0xFF2B2340);
  static const inkSoft = Color(0xFF6B6385);
  static const peach = Color(0xFFFFC4A3);
  static const peachSoft = Color(0xFFFFE8DB);
  static const success = Color(0xFF3F9E7A);
  static const error = Color(0xFFC0392B);

  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [lilac, peach],
  );
  static const softGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [lilacSoft, peachSoft],
  );
}

ThemeData buildAikoTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AikoColors.lilac,
    primary: AikoColors.violet,
    onPrimary: Colors.white,
    secondary: AikoColors.peach,
    surface: Colors.white,
    onSurface: AikoColors.ink,
    error: AikoColors.error,
  );
  const radius = BorderRadius.all(Radius.circular(18));
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AikoColors.lavenderBg,
    textTheme: Typography.material2021().black.apply(
          bodyColor: AikoColors.ink,
          displayColor: AikoColors.ink,
        ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      foregroundColor: AikoColors.ink,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: radius,
        borderSide: const BorderSide(color: AikoColors.violet, width: 2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(56),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: AikoColors.lilacSoft,
      height: 72,
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
