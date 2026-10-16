import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

type ConnectionOptions = Pick<
  PostgresConnectionOptions,
  'host' | 'port' | 'username' | 'password' | 'database' | 'ssl' | 'extra'
>;

/** Una variable vacía (p. ej. `DB_SYNCHRONIZE=` copiada de .env.example) cuenta como no definida. */
function read(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key];
  return value === undefined || value.trim() === '' ? undefined : value.trim();
}

/**
 * Opciones de conexión a PostgreSQL compartidas por la app (app.module.ts) y
 * por el CLI de migraciones (data-source.ts), para que ambos se conecten igual.
 *
 * - DB_SSL=true      → activa SSL (obligatorio en Supabase).
 * - DB_SSL_CA        → certificado CA en PEM; si se define, se verifica el
 *                      servidor. Sin él, el tráfico va cifrado pero sin
 *                      verificar la cadena (el pooler de Supabase la rompe
 *                      con la verificación por defecto de Node).
 * - DB_POOL_MAX      → conexiones máximas por instancia (en Vercel usar 1-3,
 *                      porque cada instancia serverless abre su propio pool).
 */
export function postgresConnection(
  env: NodeJS.ProcessEnv = process.env,
): ConnectionOptions {
  const ca = read(env, 'DB_SSL_CA')?.replace(/\\n/g, '\n');
  const ssl =
    read(env, 'DB_SSL') === 'true'
      ? ca
        ? { ca, rejectUnauthorized: true }
        : { rejectUnauthorized: false }
      : false;
  const poolMax = Number(read(env, 'DB_POOL_MAX') ?? 10);
  if (!Number.isInteger(poolMax) || poolMax < 1) {
    throw new Error('DB_POOL_MAX debe ser un entero positivo');
  }
  return {
    host: read(env, 'DB_HOST') ?? 'localhost',
    port: Number(read(env, 'DB_PORT') ?? 5432),
    username: read(env, 'DB_USER') ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    database: read(env, 'DB_NAME') ?? 'aiko',
    ssl,
    extra: { max: poolMax },
  };
}

/**
 * synchronize solo en desarrollo, salvo que DB_SYNCHRONIZE lo fuerce.
 * Con Supabase conviene DB_SYNCHRONIZE=false: el esquema lo crean las
 * migraciones, y mezclar ambos hace fallar la migración inicial.
 */
export function shouldSynchronize(env: NodeJS.ProcessEnv = process.env) {
  const forced = read(env, 'DB_SYNCHRONIZE');
  if (forced !== undefined) return forced === 'true';
  return env.NODE_ENV !== 'production';
}

/**
 * Ejecutar migraciones al arrancar solo tiene sentido en un proceso largo
 * (Docker). En serverless se corren a mano con `npm run migration:run`, así
 * que allí se pone DB_MIGRATIONS_RUN=false.
 */
export function shouldRunMigrations(env: NodeJS.ProcessEnv = process.env) {
  const forced = read(env, 'DB_MIGRATIONS_RUN');
  if (forced !== undefined) return forced === 'true';
  return env.NODE_ENV === 'production';
}
