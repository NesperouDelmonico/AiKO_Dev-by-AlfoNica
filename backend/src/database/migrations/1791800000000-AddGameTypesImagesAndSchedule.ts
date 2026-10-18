import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameTypesImagesAndSchedule1791800000000 implements MigrationInterface {
  name = 'AddGameTypesImagesAndSchedule1791800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Tipo de juego del ejercicio, deducido de la categoría para los existentes.
    await queryRunner.query(`
      CREATE TYPE "ejercicio_tipo_enum" AS ENUM (
        'atencion_sostenida', 'memoria_secuencias', 'reaccion',
        'completar_palabras', 'recordar_imagenes', 'logica'
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "ejercicio" ADD COLUMN "tipo" "ejercicio_tipo_enum"`,
    );
    await queryRunner.query(`
      UPDATE "ejercicio" SET "tipo" = CASE "categoria"
        WHEN 'Atención' THEN 'atencion_sostenida'::"ejercicio_tipo_enum"
        WHEN 'Memoria' THEN 'memoria_secuencias'::"ejercicio_tipo_enum"
        ELSE 'reaccion'::"ejercicio_tipo_enum"
      END
    `);
    await queryRunner.query(
      `ALTER TABLE "ejercicio" ALTER COLUMN "tipo" SET NOT NULL`,
    );

    // Periodo del plan y fecha de completado (desbloqueo de días por fecha).
    await queryRunner.query(
      `ALTER TABLE "ruta_terapeutica" ADD COLUMN "duracion_dias" integer`,
    );
    await queryRunner.query(`
      ALTER TABLE "ruta_terapeutica" ADD CONSTRAINT "CHK_ruta_duracion_dias"
      CHECK ("duracion_dias" IS NULL OR "duracion_dias" BETWEEN 1 AND 31)
    `);
    await queryRunner.query(
      `ALTER TABLE "ruta_ejercicio" ADD COLUMN "fecha_completado" TIMESTAMP`,
    );
    await queryRunner.query(`
      UPDATE "ruta_ejercicio" re SET "fecha_completado" = r."ultima"
      FROM (
        SELECT "ruta_ejercicio_id", MAX("fecha") AS "ultima"
        FROM "resultado_ejercicio" GROUP BY "ruta_ejercicio_id"
      ) r
      WHERE r."ruta_ejercicio_id" = re."id" AND re."estado" = 'Completado'
    `);

    // Imágenes de los ejercicios.
    await queryRunner.query(`
      CREATE TABLE "imagen" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_mime" character varying(20) NOT NULL,
        "datos" bytea NOT NULL,
        "tamano" integer NOT NULL,
        "usuario_id" uuid NOT NULL,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_imagen" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_imagen_tipo_mime"
          CHECK ("tipo_mime" IN ('image/png', 'image/jpeg')),
        CONSTRAINT "FK_imagen_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "imagen"`);
    await queryRunner.query(
      `ALTER TABLE "ruta_ejercicio" DROP COLUMN "fecha_completado"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ruta_terapeutica" DROP CONSTRAINT "CHK_ruta_duracion_dias"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ruta_terapeutica" DROP COLUMN "duracion_dias"`,
    );
    await queryRunner.query(`ALTER TABLE "ejercicio" DROP COLUMN "tipo"`);
    await queryRunner.query(`DROP TYPE "ejercicio_tipo_enum"`);
  }
}
