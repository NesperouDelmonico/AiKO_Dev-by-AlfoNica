import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

/// Paleta tomada del logo de AiKO: morado de marca, lilas de la mascota y
/// la estrella amarilla. Los textos usan un violeta muy oscuro para buen
/// contraste; los colores claros se reservan para fondos y acentos.
class AikoColors {
  // Marca (logo e ícono).
  static const violet = Color(0xFF6D28D9);
  static const violetBright = Color(0xFF8B5CFF);
  static const violetDeep = Color(0xFF4C1D95);
  static const star = Color(0xFFFFD23F);
  static const starDeep = Color(0xFFE0A800);

  // Mascota y fondos.
  static const lilac = Color(0xFFB9A6F0);
  static const lilacSoft = Color(0xFFE9E1FF);
  static const lavenderBg = Color(0xFFF6F2FF);

  // Texto.
  static const ink = Color(0xFF2B2340);
  static const inkSoft = Color(0xFF6B6385);

  // Acentos secundarios (secciones del camino, avisos suaves).
  static const peach = Color(0xFFFFC4A3);
  static const peachSoft = Color(0xFFFFE8DB);
  static const mint = Color(0xFF3FBF8F);
  static const mintSoft = Color(0xFFDDF6EC);
  static const sky = Color(0xFF4F8EF7);
  static const skySoft = Color(0xFFE1ECFF);

  static const success = Color(0xFF2F9E73);
  static const error = Color(0xFFC0392B);

  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [violetBright, violet],
  );
  static const softGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFF1EBFF), Color(0xFFFFF7E6)],
  );
}

const _fontFamily = 'Nunito';

/// Botón compacto para diálogos: el tema usa ancho completo, que no cabe en
/// la fila de acciones de un AlertDialog.
final dialogButtonStyle = FilledButton.styleFrom(minimumSize: const Size(96, 48));

ThemeData buildAikoTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AikoColors.violet,
    primary: AikoColors.violet,
    onPrimary: Colors.white,
    secondary: AikoColors.star,
    onSecondary: AikoColors.ink,
    surface: Colors.white,
    onSurface: AikoColors.ink,
    error: AikoColors.error,
  );
  const radius = BorderRadius.all(Radius.circular(18));
  final text = Typography.material2021().black.apply(
        fontFamily: _fontFamily,
        bodyColor: AikoColors.ink,
        displayColor: AikoColors.ink,
      );
  return ThemeData(
    useMaterial3: true,
    fontFamily: _fontFamily,
    colorScheme: scheme,
    scaffoldBackgroundColor: AikoColors.lavenderBg,
    textTheme: text.copyWith(
      headlineMedium: text.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
      headlineSmall: text.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
      titleLarge: text.titleLarge?.copyWith(fontWeight: FontWeight.w800),
    ),
    // Transición de eje compartido (deslizar + fundido) al abrir páginas.
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: SharedAxisPageTransitionsBuilder(
          transitionType: SharedAxisTransitionType.horizontal,
        ),
        TargetPlatform.iOS: SharedAxisPageTransitionsBuilder(
          transitionType: SharedAxisTransitionType.horizontal,
        ),
      },
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: AikoColors.ink,
      titleTextStyle: TextStyle(
        fontFamily: _fontFamily,
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: AikoColors.ink,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: radius,
        borderSide: const BorderSide(color: AikoColors.lilacSoft, width: 2),
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
        textStyle: const TextStyle(
            fontFamily: _fontFamily, fontSize: 17, fontWeight: FontWeight.w800),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        side: const BorderSide(color: AikoColors.lilac, width: 2),
        textStyle: const TextStyle(
            fontFamily: _fontFamily, fontSize: 16, fontWeight: FontWeight.w800),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AikoColors.violetDeep,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: AikoColors.lilacSoft,
      height: 74,
      elevation: 8,
      shadowColor: AikoColors.violet.withValues(alpha: 0.2),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontFamily: _fontFamily,
          fontSize: 12,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w900
              : FontWeight.w700,
          color: states.contains(WidgetState.selected)
              ? AikoColors.violet
              : AikoColors.inkSoft,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          size: 26,
          color: states.contains(WidgetState.selected)
              ? AikoColors.violet
              : AikoColors.inkSoft,
        ),
      ),
    ),
  );
}
