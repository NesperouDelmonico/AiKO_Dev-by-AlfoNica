import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

/// Paleta tomada del logo de AiKO: morado de marca, lilas de la mascota y
/// la estrella amarilla. Los textos usan un violeta muy oscuro para buen
/// contraste; los colores claros se reservan para fondos y acentos.
///
/// Los fondos y textos cambian en modo noche ([dark]); los colores de marca
/// y de acento son los mismos en los dos modos.
class AikoColors {
  /// Modo noche activo. Lo fija `AikoApp` antes de construir el tema.
  static bool dark = false;

  static Color _pick(Color light, Color night) => dark ? night : light;

  // Marca (logo e ícono).
  /// Morado de marca para fondos fijos (botones, burbujas).
  static const brand = Color(0xFF6D28D9);
  static const violetBright = Color(0xFF8B5CFF);

  /// Morado de textos e íconos: de noche se aclara para leerse.
  static Color get violet => _pick(brand, const Color(0xFF9B72F2));
  static Color get violetDeep => _pick(const Color(0xFF4C1D95), const Color(0xFFD4C6FF));
  static const star = Color(0xFFFFD23F);
  static const starDeep = Color(0xFFE0A800);

  // Mascota y fondos.
  static const lilac = Color(0xFFB9A6F0);
  static Color get lilacSoft => _pick(const Color(0xFFE9E1FF), const Color(0xFF342A4F));
  static Color get lavenderBg => _pick(const Color(0xFFF6F2FF), const Color(0xFF15111F));

  /// Tarjetas, barras y cuadros de texto (blanco de día).
  static Color get surface => _pick(Colors.white, const Color(0xFF231C33));

  // Texto.
  static Color get ink => _pick(const Color(0xFF2B2340), const Color(0xFFF2EEFC));
  static Color get inkSoft => _pick(const Color(0xFF6B6385), const Color(0xFFB9B1D0));

  // Acentos secundarios (secciones del camino, avisos suaves).
  static const peach = Color(0xFFFFC4A3);
  static Color get peachSoft => _pick(const Color(0xFFFFE8DB), const Color(0xFF41302A));
  static const mint = Color(0xFF3FBF8F);
  static Color get mintSoft => _pick(const Color(0xFFDDF6EC), const Color(0xFF1C3B31));
  static const sky = Color(0xFF4F8EF7);
  static Color get skySoft => _pick(const Color(0xFFE1ECFF), const Color(0xFF1E2B47));

  static const success = Color(0xFF2F9E73);
  static const error = Color(0xFFC0392B);

  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [violetBright, brand],
  );
  static LinearGradient get softGradient => LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: dark
            ? const [Color(0xFF1D1730), Color(0xFF241C2C)]
            : const [Color(0xFFF1EBFF), Color(0xFFFFF7E6)],
      );

  /// Fondo suave de un acento: el tono claro de día y, de noche, el acento
  /// mezclado con la superficie oscura.
  static Color tint(Color accent, Color light) =>
      dark ? Color.alphaBlend(accent.withValues(alpha: 0.24), surface) : light;

  /// Texto o ícono oscuro de un acento: de noche se aclara para leerse
  /// sobre fondos oscuros.
  static Color deep(Color accent, Color light) =>
      dark ? Color.lerp(accent, Colors.white, 0.45)! : light;
}

const _fontFamily = 'Nunito';

/// Botón compacto para diálogos: el tema usa ancho completo, que no cabe en
/// la fila de acciones de un AlertDialog.
final dialogButtonStyle = FilledButton.styleFrom(minimumSize: const Size(96, 48));

/// Tema de la app. Usa el modo de [AikoColors.dark].
ThemeData buildAikoTheme() {
  final dark = AikoColors.dark;
  final scheme = ColorScheme.fromSeed(
    brightness: dark ? Brightness.dark : Brightness.light,
    seedColor: AikoColors.brand,
    primary: dark ? AikoColors.violetBright : AikoColors.brand,
    onPrimary: Colors.white,
    secondary: AikoColors.star,
    onSecondary: AikoColors.ink,
    surface: AikoColors.surface,
    onSurface: AikoColors.ink,
    error: AikoColors.error,
  );
  const radius = BorderRadius.all(Radius.circular(18));
  final base = Typography.material2021();
  final text = (dark ? base.white : base.black).apply(
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
    appBarTheme: AppBarTheme(
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
      fillColor: AikoColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide(color: AikoColors.lilacSoft, width: 2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide(color: AikoColors.violet, width: 2),
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
      backgroundColor: Color(0xFF4C1D95),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AikoColors.surface,
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
