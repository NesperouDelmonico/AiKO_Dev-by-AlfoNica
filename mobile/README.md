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

- Login, sesión persistente (JWT en almacenamiento seguro), navegación inferior.
- Inicio con datos de muestra: se conectará a `GET /v1/pacientes/:id/rutas/activa`.
- Seguimiento y Ejercicios: pendientes.
