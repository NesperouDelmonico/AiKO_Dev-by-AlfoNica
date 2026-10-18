# AiKO

Plataforma gamificada de **rehabilitación cognitiva** para pacientes con
trauma craneoencefálico. El especialista diseña rutas terapéuticas de
ejercicios desde la web y el paciente los realiza como mini-juegos en el
celular; los resultados vuelven al especialista como reportes de progreso.

Proyecto de grado · Ingeniería de Sistemas · Universidad Católica Luis Amigó.

## Enlaces

| | |
|---|---|
| 🌐 **Panel web** (especialistas y administradores) | **https://aiko-web-0frz.onrender.com** |
| 📱 **App Android** (pacientes) | [**Descargar el último APK**](https://github.com/NesperouDelmonico/AiKO_Dev-by-AlfoNica/releases/latest/download/aiko.apk) · [todas las versiones](https://github.com/NesperouDelmonico/AiKO_Dev-by-AlfoNica/releases) |
| ⚙️ **API** | https://ai-ko-dev-by-alfo-nica.vercel.app/v1 |

> El panel web está en el plan gratuito de Render: si estuvo inactivo, la
> primera carga puede tardar unos segundos.

## Cómo funciona

```
 Administrador ──► crea especialistas
 Especialista  ──► crea pacientes · diseña ejercicios · arma la ruta (web)
 Paciente      ──► juega su ruta día a día (app)  ──► resultados, XP, insignias
 Especialista  ◄── progreso por categoría, historial, alertas (web)
```

- **Roles.** Administrador y Especialista usan el panel web; el Paciente
  usa solo la app móvil.
- **Ruta terapéutica.** El especialista elige el periodo del plan —**un día,
  semana, quincena o mes**— y los ejercicios de cada día (puede repetirlos y
  copiar un día a los demás). El paciente hace **un día por fecha**: el día
  siguiente se habilita al día calendario siguiente (hora de Colombia).
- **Puntaje.** Cada intento se guarda. Con 60 % o más el ejercicio se
  completa y suma XP; por debajo, el paciente puede intentarlo otra vez.

### Ejercicios (mini-juegos)

| Juego | Qué hace el paciente | Lo que configura el especialista |
|---|---|---|
| **Reacción rápida** | Toca el círculo apenas aparece | Intentos y tiempo límite |
| **Completar palabras** | Arrastra las letras que faltan y luego ordena la frase | Imagen de referencia, palabra o frase, letras ocultas, tiempo máximo |
| **Recordar imágenes** | Memoriza tarjetas que luego se voltean y escribe qué era cada una | Imágenes, palabras clave válidas, tiempo para memorizar |
| **Lógica matemática** | Lee el problema y elige la respuesta (A, B, C…) | Imagen opcional, enunciado, opciones y la correcta |

Cada ejercicio tiene además una **categoría cognitiva** (Atención, Memoria,
Velocidad) para los reportes. *Atención sostenida* y *Secuencias de
memoria* existen en el catálogo, pero su juego aún está en desarrollo.

## Estructura del repositorio

| Carpeta | Qué es | Tecnología | Despliegue |
|---|---|---|---|
| [`backend/`](backend/README.md) | API REST (`/v1`), contrato OpenAPI en `backend/docs/` | NestJS 11 · TypeORM · PostgreSQL | Vercel + Supabase |
| [`frontend/`](frontend/) | Panel web | React · Vite · TanStack Query · Tailwind | Render (`render.yaml`) |
| [`mobile/`](mobile/README.md) | App del paciente | Flutter · Provider | APK en GitHub Releases |

## Desarrollo local

**Backend**
```bash
cd backend
cp .env.example .env        # PostgreSQL, JWT_SECRET, SMTP…
npm ci
npm run migration:run
npm run start:dev           # http://localhost:3000/v1
npm test                    # pruebas unitarias
npm run verify:contract     # rutas implementadas vs. OpenAPI
```

**Panel web**
```bash
cd frontend
npm ci
echo "VITE_API_URL=http://localhost:3000/v1" > .env
npm run dev                 # http://localhost:5173
npm test
npm run api:types           # regenera los tipos desde el contrato OpenAPI
```

**App móvil** (ver [`mobile/README.md`](mobile/README.md) para generar
`android/` y depurar por WiFi)
```bash
cd mobile
flutter pub get
flutter analyze && flutter test
flutter run --dart-define=API_BASE_URL=http://<IP-de-tu-PC>:3000/v1
```

## Despliegue

- **API (Vercel):** se despliega sola en cada push. Tras cambios en
  `backend/src/database/migrations/` hay que correr
  `npm run migration:run` contra la base de Supabase.
- **Panel web (Render):** blueprint en [`render.yaml`](render.yaml); se
  recompila solo cuando cambia `frontend/`. `VITE_API_URL` se fija al
  compilar. La URL de Render debe estar en `CORS_ORIGINS` de Vercel.
- **APK (GitHub Actions):** [`.github/workflows/android-apk.yml`](.github/workflows/android-apk.yml).
  En cada push que toca `mobile/` corre análisis y pruebas y compila el APK
  (artefacto en *Actions*); en `main` además publica un **Release** con
  `aiko.apk`, que queda como la última versión descargable.

### Firma del APK (recomendado)

Para que cada APK nuevo se instale **encima** del anterior, todos deben
firmarse con la misma llave. Crea una una sola vez y guárdala como secretos
del repositorio (*Settings → Secrets and variables → Actions*):

```bash
keytool -genkey -v -keystore aiko.jks -alias aiko -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 aiko.jks          # → ANDROID_KEYSTORE_BASE64
# ANDROID_KEYSTORE_PASSWORD = la contraseña elegida
# ANDROID_KEY_ALIAS         = aiko
```

Guarda `aiko.jks` fuera del repositorio. Sin estos secretos el APK se firma
con una llave temporal y hay que desinstalar la versión anterior antes de
instalar la nueva.

## Ramas

| Rama | Uso |
|---|---|
| `main` | Versión probada y validada; publica el APK |
| `dev_nesp` | Desarrollo de la app móvil (Flutter) y backend; despliega la API |
| `dev_vero` | Desarrollo del panel web (React) |
