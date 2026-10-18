# AiKO Mobile (Flutter)

App móvil de AiKO. Paleta lila–durazno, login contra la API desplegada en Vercel.

## Primera vez (genera las carpetas de plataforma)

```bash
cd mobile
flutter create --platforms=android --org co.edu.amigo --project-name aiko_mobile .
flutter pub get
```

`flutter create .` no sobrescribe `lib/`, `pubspec.yaml` ni `test/`.

Para que la app release tenga internet, en
`android/app/src/main/AndroidManifest.xml` añade dentro de `<manifest>`
(antes de `<application>`):

```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

## Ejecutar en el teléfono

```bash
flutter devices
flutter run                       # API de Vercel por defecto
flutter run --dart-define=API_BASE_URL=http://IP_LOCAL:3000/v1   # backend local
```

## Depuración por WiFi (sin cable)

Requiere Android 11+ y que PC y teléfono estén en la misma red WiFi.
`flutter run` instala y ejecuta la app por la red igual que por USB.

1. En el teléfono: Ajustes → Opciones de desarrollador → **Depuración inalámbrica** (activar).
2. Toca **Vincular dispositivo con código de vinculación**: aparece una IP:puerto y un código de 6 dígitos.
3. En la terminal (una sola vez por PC):
   ```bash
   adb pair IP:PUERTO_DE_VINCULACION      # pega el código de 6 dígitos
   ```
4. Con la pantalla principal de Depuración inalámbrica abierta, usa la IP:puerto que aparece ahí (distinto del de vinculación):
   ```bash
   adb connect IP:PUERTO
   flutter devices
   flutter run -d IP:PUERTO
   ```

El puerto de conexión cambia al reiniciar el teléfono o la depuración inalámbrica, y hay que
volver a ejecutar `adb connect`. La vinculación (`adb pair`) se conserva.
Guías para otros sistemas: `docs/SETUP_MAC.md`.

## Estado

- Login solo para pacientes, sesión persistente (JWT en almacenamiento
  seguro), recuperación y cambio de contraseña.
- Inicio: la ruta real como camino de círculos por días ("Día X de N"),
  con el día en curso, los completados y los que se habilitan por fecha.
- Juegos: Reacción rápida, Completar palabras (arrastrar letras y ordenar
  la frase), Recordar imágenes (tarjetas que se voltean) y Lógica
  matemática (opciones A, B, C…). Resultado con porcentaje, aciertos,
  tiempo, XP e insignias.
- Pendientes: juegos de Atención sostenida y Secuencias de memoria,
  pantallas de Seguimiento y Ejercicios, notificaciones push.

## APK automático

Cada push que toca `mobile/` corre `flutter analyze`, `flutter test` y
compila el APK en GitHub Actions; en `main` se publica como Release
([último APK](https://github.com/NesperouDelmonico/AiKO_Dev-by-AlfoNica/releases/latest/download/aiko.apk)).
