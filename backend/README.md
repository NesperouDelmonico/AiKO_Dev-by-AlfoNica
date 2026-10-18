# Backend AiKO

API REST en NestJS con PostgreSQL y TypeORM. Las entidades, casos de uso y
repositorios se organizan por módulos; los casos de uso dependen de puertos y
los adaptadores PostgreSQL implementan la persistencia.

## Desarrollo local

1. Instala Node.js 22 y npm.
2. Copia `.env.example` a `.env` y configura PostgreSQL, `JWT_SECRET` y, si
   corresponde, SMTP/Firebase.
3. Instala dependencias, migra y arranca:

   ```bash
   npm ci
   npm run migration:run
   npm run start:dev
   ```

La API usa el prefijo `/v1`. Swagger está disponible en `/api` fuera de
producción; en producción solo se habilita con `SWAGGER_ENABLED=true`.

## Pacientes para el panel

- `POST /v1/pacientes` requiere `fecha_nacimiento` en formato `YYYY-MM-DD`.
  Se rechazan fechas inválidas o futuras y edades mayores de 120 años. La
  edad no está limitada al rango 30-60.
- `PATCH /v1/pacientes/{id}` permite actualizar la fecha de nacimiento a un
  especialista asignado o administrador. El cuerpo debe incluir únicamente
  `fecha_nacimiento`; un cuerpo vacío o con campos no declarados responde 400.
- Las respuestas de pacientes incluyen los datos de cuenta (`nombre`, `correo`,
  `cedula`, `estado`), `fecha_nacimiento` y `edad`. La edad se calcula con la
  fecha actual de `America/Bogota`; es `null` para registros antiguos que aún
  no tengan fecha de nacimiento.
- `GET /v1/pacientes` incluye `alertas_activas` y `progreso_ruta`; este último
  es `null` cuando no existe una ruta activa. Sus totales excluyen ejercicios
  `Reemplazado`.
- `GET /v1/usuarios` acepta `q` para buscar por nombre o correo sin distinguir
  mayúsculas ni tildes, además de rol, estado y paginación.
- Resultados e historial muestran el nombre y categoría del ejercicio. El
  progreso por dominio también incluye el desglose por ejercicio, calculado
  agregadamente en PostgreSQL e incluyendo todos los intentos guardados.

## Seguridad y configuración

- `JWT_SECRET` es obligatorio; el vencimiento predeterminado del token es `8h`.
- Las contraseñas nuevas requieren 8-72 caracteres, minúscula, mayúscula y
  número. Los códigos de recuperación son de seis dígitos, vencen a los 15
  minutos y permiten hasta cinco intentos. Se guardan como HMAC-SHA-256.
- En producción `CORS_ORIGINS` es obligatorio y contiene orígenes separados por
  comas. No se permite wildcard con credenciales.
- Helmet establece cabeceras HTTP seguras; `API_BODY_LIMIT` establece el tamaño
  máximo de cuerpo (por defecto `100kb`) y `RATE_LIMIT_MAX` limita solicitudes
  generales por minuto (por defecto 100). Login y restablecimientos limitan a
  cinco solicitudes por minuto.
- `TRUST_PROXY` acepta `false` (predeterminado), `true` o un número entero de
  saltos. Detrás de un proxy inverso, Express ve por defecto la IP del proxy,
  por lo que el límite por cliente podría contabilizar a todos como una sola
  IP. Configúralo con el número exacto de proxies confiables (o `true` solo si
  todos los proxies que pueden llegar a la API son confiables) para usar la IP
  del cliente de `X-Forwarded-For`. Una configuración demasiado permisiva
  permite falsificar esa cabecera y evadir los límites.
- Las solicitudes se registran con método, estado y duración; no se registran
  cuerpos ni cabeceras de autenticación.
- El programador elimina diariamente sesiones revocadas y códigos de
  restablecimiento vencidos a las 2:00 a. m. (`America/Bogota`).

## Pruebas y contrato

```bash
npm test -- --runInBand
npm run typecheck
npm run build
npm run test:e2e -- --runInBand
npm run verify:contract
```

Las pruebas e2e requieren una base PostgreSQL descartable llamada `aiko_test`.
El test valida este nombre antes de conectarse.

## Endpoints de autenticación y rutas

- `PATCH /v1/auth/contrasena` cambia la contraseña autenticada y responde `204`.
  Conserva los campos `contraseña_actual` y `nueva_contraseña`.
- `POST /v1/auth/olvide-contrasena` solicita el código y responde `202`;
  `POST /v1/auth/restablecer-contrasena` lo consume y responde `204`. Se
  mantienen sus campos de cuerpo y el límite de cinco solicitudes por minuto.
- `GET /v1/pacientes/{id}/rutas` lista las rutas paginadas con `page` y `limit`.
  Acepta el filtro opcional `estado=Activa` o `estado=Histórica` y ordena de la
  más reciente a la más antigua. `GET /v1/pacientes/{id}/rutas/activa` continúa
  disponible para obtener solo la ruta activa.

## Migraciones

```bash
npm run migration:run
npm run migration:revert
npm run migration:generate
```

Para comprobar que el esquema y las entidades coinciden, corre `migration:run`
y luego genera una migración de comprobación. TypeORM puede finalizar con código 1
cuando informa `No changes in database schema were found`; ese mensaje indica
que no hay diferencias.

## Docker

Copia `.env.example` a `.env`, asigna `DB_PASSWORD`, `JWT_SECRET` de al menos 32
bytes y `CORS_ORIGINS`, y luego ejecuta:

```bash
docker compose up --build -d
docker compose logs -f api
docker compose down
```

La imagen usa etapas separadas de build/runtime, ejecuta como usuario no-root,
usa PostgreSQL 16 persistente y ejecuta las migraciones al iniciar en
producción.

## Despliegue en Vercel + Supabase

El backend se despliega en Vercel sin configuración especial (detecta
`src/main.ts`). Hay que configurar el **Root Directory = `backend`** del
proyecto en Vercel, porque el repositorio es un monorepo.

**Base de datos (Supabase).** Usa el _Transaction pooler_ (puerto `6543`) en
Vercel, porque cada instancia serverless abre sus propias conexiones. Variables:

```env
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.<project-ref>
DB_PASSWORD=<contraseña de la base>
DB_NAME=postgres
DB_SSL=true
DB_POOL_MAX=2
DB_SYNCHRONIZE=false      # el esquema lo crean las migraciones
DB_MIGRATIONS_RUN=false   # no migrar en cada arranque en frío
```

**Migraciones.** Se ejecutan una vez desde tu máquina, contra el _Session
pooler_ (puerto `5432`) o la conexión directa, no contra el puerto `6543`:

```bash
DB_PORT=5432 DB_SYNCHRONIZE=false npm run migration:run
```

**Tareas programadas.** Las funciones serverless no tienen un proceso
permanente, por lo que `@nestjs/schedule` no corre. Con `SCHEDULER_ENABLED=false`
los `@Cron` no se registran y las tareas se disparan por HTTP en
`/v1/cron/*` (fuera del contrato público y protegidas con `CRON_SECRET`, que
Vercel envía como `Authorization: Bearer`):

| Endpoint                       | Equivale a                    | Disparador                             |
| ------------------------------ | ----------------------------- | -------------------------------------- |
| `GET /v1/cron/evaluate-alerts` | alertas diarias, 1:00 a. m.   | `vercel.json` (06:00 UTC)              |
| `GET /v1/cron/purge-tokens`    | limpieza diaria, 2:00 a. m.   | `vercel.json` (07:00 UTC)              |
| `GET /v1/cron/send-reminders`  | recordatorios, cada minuto    | Vercel Pro o un pinger externo         |

Los recordatorios necesitan una frecuencia menor a un día: el plan Hobby de
Vercel solo permite crons diarios. Con un pinger externo (p. ej. GitHub Actions
o cron-job.org cada 5 minutos) llama a `/v1/cron/send-reminders?window=5`;
`window` indica los minutos hacia atrás en que se buscan recordatorios, y el
filtro de duplicados evita enviarlos dos veces.

**Otras variables:** `NODE_ENV=production`, `JWT_SECRET` (≥ 32 bytes),
`CORS_ORIGINS`, `TRUST_PROXY=1`, `CRON_SECRET` (≥ 16 caracteres) y las de
SMTP/Firebase. El limitador de peticiones (`RATE_LIMIT_MAX`) guarda su
contador en memoria, así que en serverless limita por instancia y no de forma
global.
