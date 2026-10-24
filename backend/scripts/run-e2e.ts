import { spawnSync } from 'node:child_process';
import path from 'node:path';
import dataSource from '../src/database/data-source';
import { postgresConnection } from '../src/database/connection';

async function resetTestDatabase() {
  const { host, port, database } = postgresConnection();
  console.log(`DB_HOST=${host}`);
  console.log(`DB_PORT=${port}`);

  if (
    (host !== 'localhost' && host !== '127.0.0.1') ||
    database !== 'aiko_test'
  ) {
    throw new Error(
      'E2E abortado: solo se permite reiniciar public en localhost/127.0.0.1 y la base aiko_test.',
    );
  }

  await dataSource.initialize();
  try {
    const [row] = (await dataSource.query(
      'SELECT current_database()',
    )) as { current_database: string }[];
    console.log('SELECT current_database();');
    console.log(row.current_database);
    if (row.current_database !== 'aiko_test') {
      throw new Error(
        'E2E abortado: current_database() no coincide con aiko_test.',
      );
    }

    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      console.log('DROP SCHEMA public CASCADE;');
      await runner.query('DROP SCHEMA public CASCADE');
      console.log('CREATE SCHEMA public;');
      await runner.query('CREATE SCHEMA public');
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    await dataSource.runMigrations({ transaction: 'all' });
  } finally {
    await dataSource.destroy();
  }
}

async function main() {
  if (process.argv.length > 2) {
    throw new Error('E2E abortado: npm run test:e2e no acepta argumentos adicionales.');
  }
  if (process.env.DB_NAME !== 'aiko_test') {
    throw new Error(
      'E2E abortado: define DB_NAME=aiko_test explícitamente en el entorno.',
    );
  }
  await resetTestDatabase();

  const jest = path.join(process.cwd(), 'node_modules', 'jest', 'bin', 'jest.js');
  const result = spawnSync(
    process.execPath,
    [jest, '--config', './test/jest-e2e.json', '--runInBand'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DB_NAME: 'aiko_test',
        DB_SYNCHRONIZE: 'false',
        DB_MIGRATIONS_RUN: 'false',
      },
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
