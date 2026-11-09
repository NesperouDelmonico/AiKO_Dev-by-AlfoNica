import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Economía de AiKO: monedas, accesorios del osito, potenciador de XP y
 * salvadores de racha del paciente; monedas y XP doble en cada resultado.
 */
export class AddEconomy1792300000000 implements MigrationInterface {
  name = 'AddEconomy1792300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "paciente"
        ADD COLUMN IF NOT EXISTS "monedas" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "accesorio" character varying(20) NOT NULL DEFAULT 'base',
        ADD COLUMN IF NOT EXISTS "accesorios" jsonb NOT NULL DEFAULT '["base"]',
        ADD COLUMN IF NOT EXISTS "potenciador_xp_restante" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "salvadores_racha" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "dias_protegidos" jsonb NOT NULL DEFAULT '[]'`);
    await queryRunner.query(`
      ALTER TABLE "paciente" DROP CONSTRAINT IF EXISTS "CHK_paciente_monedas";
      ALTER TABLE "paciente" ADD CONSTRAINT "CHK_paciente_monedas" CHECK ("monedas" >= 0)`);
    await queryRunner.query(`
      ALTER TABLE "resultado_ejercicio"
        ADD COLUMN IF NOT EXISTS "monedas_ganadas" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "xp_doble" boolean NOT NULL DEFAULT false`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "resultado_ejercicio"
        DROP COLUMN IF EXISTS "xp_doble",
        DROP COLUMN IF EXISTS "monedas_ganadas"`);
    await queryRunner.query(`
      ALTER TABLE "paciente"
        DROP CONSTRAINT IF EXISTS "CHK_paciente_monedas",
        DROP COLUMN IF EXISTS "dias_protegidos",
        DROP COLUMN IF EXISTS "salvadores_racha",
        DROP COLUMN IF EXISTS "potenciador_xp_restante",
        DROP COLUMN IF EXISTS "accesorios",
        DROP COLUMN IF EXISTS "accesorio",
        DROP COLUMN IF EXISTS "monedas"`);
  }
}
