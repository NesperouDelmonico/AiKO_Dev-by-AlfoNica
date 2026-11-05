import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nuevos juegos de Velocidad (Toque de color, Busca la imagen) y dibujos
 * adjuntos a los resultados de Recordar imágenes.
 */
export class AddNewGameTypes1792200000000 implements MigrationInterface {
  name = 'AddNewGameTypes1792200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "ejercicio_tipo_enum" ADD VALUE IF NOT EXISTS 'toque_color'`,
    );
    await queryRunner.query(
      `ALTER TYPE "ejercicio_tipo_enum" ADD VALUE IF NOT EXISTS 'busca_imagen'`,
    );
    await queryRunner.query(
      `ALTER TABLE "resultado_ejercicio" ADD COLUMN IF NOT EXISTS "dibujos" jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite quitar valores de un enum; solo se revierte la columna.
    await queryRunner.query(
      `ALTER TABLE "resultado_ejercicio" DROP COLUMN IF EXISTS "dibujos"`,
    );
  }
}
