import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { entities } from '../entities';
import { postgresConnection } from './connection';

export default new DataSource({
  type: 'postgres',
  ...postgresConnection(),
  entities,
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
});
