# Entorno de desarrollo en macOS

Guía para correr y depurar la app en un Mac, con el teléfono Android por USB.
(Pendiente de probar en el Mac.)

## 1. Herramientas base

```zsh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"   # si no tienes Homebrew
brew install --cask flutter android-studio
brew install --cask temurin@17
```

Abre Android Studio una vez y completa el asistente. En More Actions → SDK Manager →
SDK Tools instala Android SDK Command-line Tools, Platform-Tools y Build-Tools.

## 2. Conectar Flutter con el SDK

```zsh
flutter config --android-sdk ~/Library/Android/sdk
flutter doctor --android-licenses
flutter doctor -v
```

En Mac el SDK queda en `~/Library/Android/sdk` (en Linux: `~/Android/Sdk`).
Chrome y Xcode pueden salir en rojo; no afectan a Android.

## 3. Traer el proyecto

```zsh
git clone -b dev_nesp https://github.com/NesperouDelmonico/AiKO_Dev-by-AlfoNica.git
cd AiKO_Dev-by-AlfoNica/mobile
flutter create --platforms=android --org co.edu.amigo --project-name aiko_mobile .
flutter pub get
```

`android/` no se versiona: hay que generarlo en cada máquina. Añade el permiso
`INTERNET` al `AndroidManifest.xml` (ver README).

## 4. Conectar el teléfono

1. Activa Opciones de desarrollador y Depuración USB.
2. Conéctalo por cable; si solo carga, cambia el modo USB a "Transferencia de archivos".
3. Acepta "¿Permitir depuración USB?" en el teléfono.
4. `flutter devices` debe listarlo. Para depurar por WiFi, ver `README.md`.

## 5. Ejecutar y depurar

- VS Code (extensión Flutter) o Android Studio: abre `mobile/`, elige el dispositivo y pulsa F5 / el ícono de bug.
- Breakpoints: clic a la izquierda del número de línea (p. ej. `_submit()` en `login_screen.dart`).
- Terminal: `flutter run`. Con la app corriendo: `r` hot reload, `R` hot restart, `q` salir.
- Logs: `flutter logs` o la Debug Console. DevTools: el enlace que imprime `flutter run`.

### Backend local

```zsh
ipconfig getifaddr en0
flutter run --dart-define=API_BASE_URL=http://IP_DE_TU_MAC:3000/v1
```

Mac y teléfono en la misma red. Para HTTP sin cifrar, añade
`android:usesCleartextTraffic="true"` al `<application>` del manifest.

## Si el teléfono no aparece

```zsh
adb kill-server && adb start-server && adb devices
```

Debe salir como `device`; si sale `unauthorized`, revisa el aviso en el teléfono.

## Opción: simulador de iPhone

```zsh
xcode-select --install
sudo xcodebuild -runFirstLaunch
brew install cocoapods
cd mobile && flutter create --platforms=ios .
open -a Simulator
flutter run
```
