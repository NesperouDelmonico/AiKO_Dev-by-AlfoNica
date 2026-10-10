import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetAttempts1791600000000
  implements MigrationInterface
{
  name = 'AddPasswordResetAttempts1791600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "restablecimiento_contrasena"
      ADD COLUMN "intentos" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "restablecimiento_contrasena"
      ADD CONSTRAINT "CHK_restablecimiento_contrasena_intentos"
      CHECK ("intentos" BETWEEN 0 AND 5)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "restablecimiento_contrasena"
      DROP CONSTRAINT "CHK_restablecimiento_contrasena_intentos"
    `);
    await queryRunner.query(`
      ALTER TABLE "restablecimiento_contrasena"
      DROP COLUMN "intentos"
    `);
  }
}
