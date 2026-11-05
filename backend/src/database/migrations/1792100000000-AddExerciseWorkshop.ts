import { MigrationInterface, QueryRunner } from 'typeorm';

/** Taller: ejercicios publicados para que otros especialistas los importen como copia. */
export class AddExerciseWorkshop1792100000000 implements MigrationInterface {
  name = 'AddExerciseWorkshop1792100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ejercicio" ADD COLUMN IF NOT EXISTS "publicado" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejercicio" ADD COLUMN IF NOT EXISTS "fecha_publicacion" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejercicio" ADD COLUMN IF NOT EXISTS "origen_id" uuid`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ejercicio_origen') THEN
          ALTER TABLE "ejercicio" ADD CONSTRAINT "FK_ejercicio_origen"
            FOREIGN KEY ("origen_id") REFERENCES "ejercicio"("id") ON DELETE SET NULL;
        END IF;
      END $$`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ejercicio_taller" ON "ejercicio" ("fecha_publicacion") WHERE "publicado"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ejercicio_origen" ON "ejercicio" ("origen_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ejercicio_origen"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ejercicio_taller"`);
    await queryRunner.query(
      `ALTER TABLE "ejercicio" DROP CONSTRAINT IF EXISTS "FK_ejercicio_origen"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejercicio" DROP COLUMN IF EXISTS "origen_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejercicio" DROP COLUMN IF EXISTS "fecha_publicacion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejercicio" DROP COLUMN IF EXISTS "publicado"`,
    );
  }
}
