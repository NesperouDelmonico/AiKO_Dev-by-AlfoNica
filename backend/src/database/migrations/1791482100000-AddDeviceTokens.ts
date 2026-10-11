import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceTokens1791482100000 implements MigrationInterface {
  name = 'AddDeviceTokens1791482100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "token_dispositivo" ("token_fcm" character varying(4096) NOT NULL, "fecha_registro" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "paciente_id" uuid NOT NULL, CONSTRAINT "PK_token_dispositivo" PRIMARY KEY ("token_fcm"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_dispositivo" ADD CONSTRAINT "FK_token_dispositivo_paciente" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_dispositivo" DROP CONSTRAINT "FK_token_dispositivo_paciente"`,
    );
    await queryRunner.query(`DROP TABLE "token_dispositivo"`);
  }
}
