# AiKO — instrucciones para Claude Code

Plataforma gamificada de rehabilitación cognitiva (proyecto de grado,
Universidad Católica Luis Amigó). Equipo: Alfonso Pérez y Verónica Morante.
Responde y escribe documentación, mensajes de commit y textos de la interfaz
en **español**.

## Estructura

| Carpeta | Qué es | Despliegue |
|---|---|---|
| `backend/` | API NestJS 11 + TypeORM + Postgres (Supabase), prefijo `/v1` | Vercel, desde `main` |
| `frontend/` | Panel web React 19 + Vite + TanStack Query (especialistas y admin) | Render, desde `dev_nesp` (ver `render.yaml`) |
| `mobile/` | App Flutter para pacientes (Android) | APK por GitHub Actions |
| `backend/docs/aiko-openapi__1_.yaml` | Contrato de la API: fuente de verdad para backend, web y app | — |

Reglas por área (se cargan solas al tocar esos archivos):
`.claude/rules/aiko/backend.md`, `frontend.md`, `mobile.md`.

## Ramas y Git

- `main` recibe **solo trabajo probado y validado**. Nunca hagas commit, push
  ni merge directo a `main` sin confirmación explícita.
- `dev_nesp` es la rama de Alfonso; `dev_vero` la de Verónica. Trabaja en la
  rama actual o en una rama nueva que salga de `dev_nesp`.
- Al hacer merge con trabajo de Verónica, **no modifiques lo que ella subió**;
  si hay conflicto, pregunta.
- Nunca `git push --force` ni reescribir historia sin preguntar.
- Mensajes de commit en español: título corto en imperativo o descriptivo,
  cuerpo con viñetas si hace falta. Conserva el trailer `Co-Authored-By` de
  Claude.

## Secretos (crítico)

- Nunca subas `.env`, `google-services.json`, llaves de servicio de Firebase,
  `key.properties`, keystores ni credenciales. Usa los `.env.example`.
- Si ves un secreto en el código o en un diff, detente y avisa (ya hubo una
  filtración y se rotaron credenciales).
- Los secretos de CI van en GitHub Secrets; los del backend, en Vercel.

## Antes de dar algo por terminado

Ejecuta lo que corresponda a lo que tocaste y no declares éxito si falla:

- Backend: `cd backend && npm run typecheck && npm test && npm run verify:contract`
- Web: `cd frontend && npx tsc -b && npx oxlint && npx vitest run`
- App: `cd mobile && dart analyze --fatal-infos && flutter test`
  (el CI usa exactamente esos dos; un *info* también rompe el build)

Si cambias el contrato OpenAPI: actualiza el YAML, corre
`npm run verify:contract` en `backend/` y `npm run api:types` en `frontend/`.

## Revisión con agentes (`.claude/agents/`)

Antes de abrir un PR o de proponer un merge a `main`, pide una revisión:

- App: `flutter-reviewer` · errores de build de Flutter: `dart-build-resolver`
- Backend: `typescript-reviewer` · base de datos y migraciones: `database-reviewer`
- Web: `react-reviewer`
- Cualquier cambio en autenticación, roles, subida de archivos o datos de
  pacientes: `security-reviewer`
- Funcionalidad grande: planifica primero con `planner`
- Cobertura de pruebas de un PR: `pr-test-analyzer`

Los agentes vienen de ECC (licencia MIT, ver `.claude/ECC-NOTICE.md`). Sus
ejemplos son genéricos: **manda el código y las reglas de AiKO** cuando
recomienden otra librería o arquitectura (Zod, Riverpod, BLoC, GoRouter,
Prisma…). No migres a esas librerías sin pedirlo.
