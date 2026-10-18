import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientDateOfBirth1791700000000 implements MigrationInterface {
  name = 'AddPatientDateOfBirth1791700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "paciente" ADD COLUMN "fecha_nacimiento" date`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "paciente" DROP COLUMN "fecha_nacimiento"`,
    );
  }
}
