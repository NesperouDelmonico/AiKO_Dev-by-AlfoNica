---
paths:
  - "mobile/**"
  - ".github/workflows/android-apk.yml"
---
# App móvil (Flutter) — reglas de AiKO

## Versiones (no cambiar sin acordarlo)

- Flutter **3.35.7** (fijado en el CI). No uses APIs de versiones más nuevas.
- Android: AGP 8.9.1, Kotlin 2.1.0, Gradle 8.12, JDK **17** (Java 25 rompe
  Gradle). `minSdk` = `maxOf(flutter.minSdkVersion, 23)`.
- `google-services.json` no se versiona: en CI sale del secreto
  `GOOGLE_SERVICES_JSON`, y el plugin de Google Services solo se aplica si el
  archivo existe.

## Estilo del proyecto

- Estado con `StatefulWidget`/`setState` y servicios simples en `lib/core/`.
  **No** introduzcas Riverpod, BLoC, GetX ni GoRouter: la navegación es con
  `Navigator`.
- Imports relativos dentro de `lib/`.
- Pacientes con trauma craneoencefálico: textos cortos y amables, letra grande,
  áreas táctiles amplias, nada de prisas innecesarias. Todo control interactivo
  lleva `Semantics` con un `label` en español.
- Colores y tarjetas desde `lib/core/theme.dart` (`AikoColors`, `softCard`) y
  los juegos dentro de `GameShell` (`lib/features/games/game_shell.dart`).
- Imágenes de marca con `BrandImage('nombre', fallback: ...)` (busca
  `assets/brand/ia/<nombre>.png` y si no existe dibuja el respaldo).
- Cada juego devuelve un `GameOutcome` con `Navigator.pop`. Los tipos de juego
  y su clasificación están en `Exercise` (`lib/core/models.dart`) y
  `GameStyle` (`lib/core/game_style.dart`); deben coincidir con el backend.

## Pruebas y análisis

- El CI corre `dart analyze --fatal-infos` y `flutter test`: un *info* del
  analizador también rompe el build.
- En pruebas de juegos con temporizadores, avanza el tiempo con
  `tester.pump(Duration)` en pasos; evita `pumpAndSettle` con temporizadores
  periódicos, y no midas tiempos límite con `Stopwatch` (en pruebas el reloj
  real no avanza): usa el propio `Timer`.
- Inyecta `Random` (con semilla) y dependencias como el audio para que las
  pruebas sean deterministas.
