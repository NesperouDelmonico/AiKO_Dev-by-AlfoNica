import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokens1791560000000 implements MigrationInterface {
  name = 'AddPasswordResetTokens1791560000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "restablecimiento_contrasena" (
        "token_hash" character varying(64) NOT NULL,
        "usuario_id" uuid NOT NULL,
        "expira_en" TIMESTAMP WITH TIME ZONE NOT NULL,
        "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_restablecimiento_contrasena" PRIMARY KEY ("token_hash"),
        CONSTRAINT "FK_restablecimiento_contrasena_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_restablecimiento_contrasena_usuario"
      ON "restablecimiento_contrasena" ("usuario_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_restablecimiento_contrasena_usuario"`,
    );
    await queryRunner.query(`DROP TABLE "restablecimiento_contrasena"`);
  }
}
