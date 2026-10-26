import { MigrationInterface, QueryRunner } from 'typeorm';

/** Ejercicios archivados (ocultos del catálogo, vigentes en rutas que ya los usan). */
export class AddExerciseArchive1792000000000 implements MigrationInterface {
  name = 'AddExerciseArchive1792000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ejercicio" ADD COLUMN IF NOT EXISTS "archivado_en" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ejercicio_especialista_archivado" ON "ejercicio" ("especialista_id", "archivado_en")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ejercicio_especialista_archivado"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejercicio" DROP COLUMN IF EXISTS "archivado_en"`,
    );
  }
}
