import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTherapyPartialUniqueIndexes1791482200000 implements MigrationInterface {
  name = 'AddTherapyPartialUniqueIndexes1791482200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ruta_activa_por_paciente" ON "ruta_terapeutica" ("paciente_id") WHERE "estado" = 'Activa'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ruta_orden_vigente" ON "ruta_ejercicio" ("ruta_id", "orden") WHERE "estado" <> 'Reemplazado'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_ruta_orden_vigente"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_ruta_activa_por_paciente"`,
    );
  }
}
