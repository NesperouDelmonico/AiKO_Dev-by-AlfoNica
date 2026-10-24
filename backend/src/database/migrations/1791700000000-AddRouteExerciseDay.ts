import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRouteExerciseDay1791700000000 implements MigrationInterface {
  name = 'AddRouteExerciseDay1791700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ruta_ejercicio"
      ADD COLUMN "dia" integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "ruta_ejercicio"
      ADD CONSTRAINT "CHK_ruta_ejercicio_dia" CHECK ("dia" > 0)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ruta_ejercicio" DROP CONSTRAINT "CHK_ruta_ejercicio_dia"
    `);
    await queryRunner.query(`ALTER TABLE "ruta_ejercicio" DROP COLUMN "dia"`);
  }
}
