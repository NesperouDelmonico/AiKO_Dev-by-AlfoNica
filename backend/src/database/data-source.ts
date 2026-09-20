import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { entities } from '../entities';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'aiko',
  entities,
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
});
