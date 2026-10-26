import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientDateOfBirth1791900000000 implements MigrationInterface {
  name = 'AddPatientDateOfBirth1791900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "paciente" ADD COLUMN IF NOT EXISTS "fecha_nacimiento" date`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "paciente" DROP COLUMN IF EXISTS "fecha_nacimiento"`,
    );
  }
}
