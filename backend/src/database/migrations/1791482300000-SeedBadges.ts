import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedBadges1791482300000 implements MigrationInterface {
  name = 'SeedBadges1791482300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "insignia" ("nombre", "descripcion", "condicion")
      SELECT badge.nombre, badge.descripcion, badge.condicion
      FROM (VALUES
        ('Primer paso', 'Completa tu primera sesión terapéutica.', 'sesiones >= 1'),
        ('Constancia', 'Completa 10 sesiones terapéuticas.', 'sesiones >= 10'),
        ('Compromiso', 'Completa 50 sesiones terapéuticas.', 'sesiones >= 50'),
        ('Precisión', 'Acumula 100 aciertos.', 'aciertos >= 100'),
        ('Explorador', 'Alcanza el nivel 5.', 'nivel >= 5'),
        ('Experto', 'Alcanza el nivel 10.', 'nivel >= 10'),
        ('Excelencia', 'Obtén un puntaje máximo de 90 o más.', 'mejor_puntaje >= 90')
      ) AS badge(nombre, descripcion, condicion)
      WHERE NOT EXISTS (
        SELECT 1 FROM "insignia" existing WHERE existing."nombre" = badge.nombre
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "insignia" badge
      WHERE badge."nombre" IN (
        'Primer paso',
        'Constancia',
        'Compromiso',
        'Precisión',
        'Explorador',
        'Experto',
        'Excelencia'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "paciente_insignia" awarded
        WHERE awarded."insignia_id" = badge."id"
      )
    `);
  }
}
