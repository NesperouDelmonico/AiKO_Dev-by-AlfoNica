import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRevokedTokens1791482000000 implements MigrationInterface {
  name = 'AddRevokedTokens1791482000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sesion_revocada" ("token_id" character varying(36) NOT NULL, "expira_en" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_sesion_revocada_token" PRIMARY KEY ("token_id"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sesion_revocada"`);
  }
}
