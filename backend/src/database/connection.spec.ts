import {
  postgresConnection,
  shouldRunMigrations,
  shouldSynchronize,
} from './connection';

describe('postgresConnection', () => {
  it('usa valores locales por defecto, sin SSL', () => {
    expect(postgresConnection({})).toEqual({
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'aiko',
      ssl: false,
      extra: { max: 10 },
    });
  });

  it('activa SSL sin verificar cadena cuando no hay CA', () => {
    expect(postgresConnection({ DB_SSL: 'true' }).ssl).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('verifica el servidor cuando se entrega DB_SSL_CA', () => {
    const { ssl } = postgresConnection({
      DB_SSL: 'true',
      DB_SSL_CA: 'LINEA1\\nLINEA2',
    });
    expect(ssl).toEqual({ ca: 'LINEA1\nLINEA2', rejectUnauthorized: true });
  });

  it('trata las variables vacías de .env.example como no definidas', () => {
    const options = postgresConnection({
      DB_HOST: '',
      DB_POOL_MAX: '',
      DB_SSL: '',
    });
    expect(options).toMatchObject({
      host: 'localhost',
      ssl: false,
      extra: { max: 10 },
    });
  });

  it.each(['0', '-1', '2.5', 'abc'])('rechaza DB_POOL_MAX=%s', (value) => {
    expect(() => postgresConnection({ DB_POOL_MAX: value })).toThrow(
      'DB_POOL_MAX',
    );
  });
});

describe('shouldSynchronize / shouldRunMigrations', () => {
  it('conservan el comportamiento previo por NODE_ENV', () => {
    expect(shouldSynchronize({ NODE_ENV: 'development' })).toBe(true);
    expect(shouldSynchronize({ NODE_ENV: 'production' })).toBe(false);
    expect(shouldRunMigrations({ NODE_ENV: 'development' })).toBe(false);
    expect(shouldRunMigrations({ NODE_ENV: 'production' })).toBe(true);
  });

  it('se pueden forzar con variables explícitas', () => {
    expect(
      shouldSynchronize({ NODE_ENV: 'development', DB_SYNCHRONIZE: 'false' }),
    ).toBe(false);
    expect(
      shouldRunMigrations({
        NODE_ENV: 'production',
        DB_MIGRATIONS_RUN: 'false',
      }),
    ).toBe(false);
  });

  it('una variable vacía no pisa el valor por defecto', () => {
    expect(
      shouldSynchronize({ NODE_ENV: 'development', DB_SYNCHRONIZE: '' }),
    ).toBe(true);
    expect(
      shouldRunMigrations({ NODE_ENV: 'production', DB_MIGRATIONS_RUN: '' }),
    ).toBe(true);
  });
});
