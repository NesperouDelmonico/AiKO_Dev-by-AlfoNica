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
```

Para comprobar que el esquema y las entidades coinciden, corre `migration:run`
y luego genera una migración temporal. TypeORM puede finalizar con código 1
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
