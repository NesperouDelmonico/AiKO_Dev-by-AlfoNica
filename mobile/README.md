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

## Estado

- Login, sesión persistente (JWT en almacenamiento seguro), navegación inferior.
- Inicio con datos de muestra: se conectará a `GET /v1/pacientes/:id/rutas/activa`.
- Seguimiento y Ejercicios: pendientes.
