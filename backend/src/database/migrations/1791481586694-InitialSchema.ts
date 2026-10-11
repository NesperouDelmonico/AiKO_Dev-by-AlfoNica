import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791481586694 implements MigrationInterface {
  name = 'InitialSchema1791481586694';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_rol_enum" AS ENUM('Paciente', 'Especialista', 'Administrador')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuario" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "cedula" character varying(20) NOT NULL, "correo" character varying(150) NOT NULL, "contraseña_hash" character varying(255) NOT NULL, "rol" "public"."usuario_rol_enum" NOT NULL, "estado" boolean NOT NULL DEFAULT true, "intentos_fallidos" integer NOT NULL DEFAULT '0', "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_83ffe924cd2d60b07421bf8dfc6" UNIQUE ("cedula"), CONSTRAINT "UQ_349ecb64acc4355db443ca17cbd" UNIQUE ("correo"), CONSTRAINT "CHK_168a4c781805d0dc66f42bd578" CHECK ("intentos_fallidos" >= 0), CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "administrador" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usuario_id" uuid, CONSTRAINT "REL_9fc8d6c54afc4893421991ce97" UNIQUE ("usuario_id"), CONSTRAINT "PK_a84433082c320e8c25abe76c52e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "especialista" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usuario_id" uuid, CONSTRAINT "REL_80349ae00410adcb208ba7616e" UNIQUE ("usuario_id"), CONSTRAINT "PK_582dee5fab4f9cc39a1a2b2d013" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "paciente" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "xp_total" integer NOT NULL DEFAULT '0', "nivel_actual" integer NOT NULL DEFAULT '1', "umbral_bajo_rendimiento" numeric(5,2) NOT NULL, "umbral_dias_inactividad" integer NOT NULL, "fecha_asignacion" date NOT NULL, "usuario_id" uuid, "especialista_id" uuid, CONSTRAINT "REL_e38aac65e9bef48cfb293f99a0" UNIQUE ("usuario_id"), CONSTRAINT "CHK_d9f690cd9683c5e6ac0ac8b89a" CHECK ("umbral_dias_inactividad" > 0), CONSTRAINT "CHK_1e53693d2614875653aca0f91b" CHECK ("umbral_bajo_rendimiento" BETWEEN 0 AND 100), CONSTRAINT "CHK_30d9fafabfcb6d85ffb52f27de" CHECK ("xp_total" >= 0), CONSTRAINT "CHK_e019cc22cbe7d01a88af4da089" CHECK ("nivel_actual" > 0), CONSTRAINT "PK_cbcb7985432e4b49d32c5243867" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incidencia_estado_enum" AS ENUM('Pendiente', 'En proceso', 'Resuelta')`,
    );
    await queryRunner.query(
      `CREATE TABLE "incidencia" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "descripcion" text NOT NULL, "estado" "public"."incidencia_estado_enum" NOT NULL, "fecha" TIMESTAMP NOT NULL DEFAULT now(), "usuario_id" uuid, CONSTRAINT "PK_1e98587e9dc53e62e039e0dbabf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ejercicio_categoria_enum" AS ENUM('Atención', 'Memoria', 'Velocidad')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ejercicio_estado_enum" AS ENUM('Activo', 'Desactivado')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ejercicio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "categoria" "public"."ejercicio_categoria_enum" NOT NULL, "instrucciones" text NOT NULL, "parametros" jsonb NOT NULL, "nivel_dificultad" integer NOT NULL, "estado" "public"."ejercicio_estado_enum" NOT NULL, "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(), "especialista_id" uuid, CONSTRAINT "CHK_5d6d4763858b1fa692483d956d" CHECK ("nivel_dificultad" > 0), CONSTRAINT "PK_09160ab0efc6c5440304e762d2c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ruta_ejercicio_estado_enum" AS ENUM('Pendiente', 'Completado', 'Reemplazado')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ruta_ejercicio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orden" integer NOT NULL, "estado" "public"."ruta_ejercicio_estado_enum" NOT NULL, "ruta_id" uuid, "ejercicio_id" uuid, CONSTRAINT "CHK_58942faafae2e47edaa448b991" CHECK ("orden" > 0), CONSTRAINT "PK_884e5c9285a24cc29d9b622a37a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ruta_terapeutica_estado_enum" AS ENUM('Activa', 'Histórica')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ruta_terapeutica" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "estado" "public"."ruta_terapeutica_estado_enum" NOT NULL, "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(), "paciente_id" uuid, CONSTRAINT "PK_bdd3a2e3a9d59df7fcf71d33758" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "resultado_ejercicio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "puntaje" integer NOT NULL, "tiempo_reaccion_ms" integer, "aciertos" integer NOT NULL, "xp_ganado" integer NOT NULL, "fecha" TIMESTAMP NOT NULL DEFAULT now(), "paciente_id" uuid, "ruta_ejercicio_id" uuid, CONSTRAINT "CHK_ecebbd5f76ec48988bfc705a0e" CHECK ("tiempo_reaccion_ms" IS NULL OR "tiempo_reaccion_ms" >= 0), CONSTRAINT "CHK_7b65927ec504428b2561318821" CHECK ("xp_ganado" >= 0), CONSTRAINT "CHK_4586403825bcfd4d570b5d1770" CHECK ("aciertos" >= 0), CONSTRAINT "CHK_38f9ade169e6788e78d30b88d9" CHECK ("puntaje" >= 0), CONSTRAINT "PK_d77de0b0df3daf4ddf5811eaa11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "insignia" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(100) NOT NULL, "descripcion" text NOT NULL, "condicion" character varying NOT NULL, CONSTRAINT "PK_ad8d91b1b6b8fff46e0e7f93273" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "paciente_insignia" ("paciente_id" uuid NOT NULL, "insignia_id" uuid NOT NULL, "fecha_obtenida" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2714148ee51ca33eb1cbbd96aef" PRIMARY KEY ("paciente_id", "insignia_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "observacion" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "texto" text NOT NULL, "fecha" TIMESTAMP NOT NULL DEFAULT now(), "paciente_id" uuid, "especialista_id" uuid, CONSTRAINT "PK_5e0b812d302b40504cd5744e30a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."alerta_tipo_enum" AS ENUM('BajoRendimiento', 'Inactividad')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."alerta_estado_enum" AS ENUM('Activa', 'Resuelta')`,
    );
    await queryRunner.query(
      `CREATE TABLE "alerta" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo" "public"."alerta_tipo_enum" NOT NULL, "estado" "public"."alerta_estado_enum" NOT NULL, "fecha_generada" TIMESTAMP NOT NULL DEFAULT now(), "paciente_id" uuid, CONSTRAINT "PK_e60bfc27e2ae1b6bbdca11ac524" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notificacion_tipo_enum" AS ENUM('Recordatorio', 'SubidaNivel', 'InsigniaObtenida')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notificacion" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo" "public"."notificacion_tipo_enum" NOT NULL, "mensaje" text NOT NULL, "leida" boolean NOT NULL DEFAULT false, "fecha_envio" TIMESTAMP NOT NULL DEFAULT now(), "paciente_id" uuid, CONSTRAINT "PK_b4402a54386266ca21a86420f77" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "preferencia_notificacion" ("paciente_id" uuid NOT NULL, "frecuencia" character varying(20) NOT NULL, "horario_recordatorio" TIME NOT NULL, CONSTRAINT "PK_f038b5a9d6a6f0c8e7752baf2f7" PRIMARY KEY ("paciente_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "administrador" ADD CONSTRAINT "FK_9fc8d6c54afc4893421991ce979" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "especialista" ADD CONSTRAINT "FK_80349ae00410adcb208ba7616e8" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente" ADD CONSTRAINT "FK_e38aac65e9bef48cfb293f99a05" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente" ADD CONSTRAINT "FK_b00406486306cf8b93da5d3b3a1" FOREIGN KEY ("especialista_id") REFERENCES "especialista"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidencia" ADD CONSTRAINT "FK_fa72306cea1cad2cf72cc4c4d4a" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejercicio" ADD CONSTRAINT "FK_7873ff437d01c5a6eaedd7fc679" FOREIGN KEY ("especialista_id") REFERENCES "especialista"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "ruta_ejercicio" ADD CONSTRAINT "FK_e6ada2c91de4053ca1b6ea8b646" FOREIGN KEY ("ruta_id") REFERENCES "ruta_terapeutica"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "ruta_ejercicio" ADD CONSTRAINT "FK_283caefc7287ff0d3f3463c32fe" FOREIGN KEY ("ejercicio_id") REFERENCES "ejercicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "ruta_terapeutica" ADD CONSTRAINT "FK_2f66100f5e232f465627a765259" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "resultado_ejercicio" ADD CONSTRAINT "FK_51260a156eecfa7025f6fcc9278" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "resultado_ejercicio" ADD CONSTRAINT "FK_67657479f80ccb1508b6a29ac8c" FOREIGN KEY ("ruta_ejercicio_id") REFERENCES "ruta_ejercicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente_insignia" ADD CONSTRAINT "FK_3d899deaa9615cda805098ce4d3" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente_insignia" ADD CONSTRAINT "FK_b595afda2c9ade2c2b8532a7713" FOREIGN KEY ("insignia_id") REFERENCES "insignia"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "observacion" ADD CONSTRAINT "FK_eeac18d57278422f9bd21b82a9e" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "observacion" ADD CONSTRAINT "FK_8fb9685b9d278ab2e5633a72483" FOREIGN KEY ("especialista_id") REFERENCES "especialista"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerta" ADD CONSTRAINT "FK_de31a5397876f2b17b830492ea5" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion" ADD CONSTRAINT "FK_6c92ec2d0f3fb831794f8ccee18" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferencia_notificacion" ADD CONSTRAINT "FK_f038b5a9d6a6f0c8e7752baf2f7" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "preferencia_notificacion" DROP CONSTRAINT "FK_f038b5a9d6a6f0c8e7752baf2f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion" DROP CONSTRAINT "FK_6c92ec2d0f3fb831794f8ccee18"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerta" DROP CONSTRAINT "FK_de31a5397876f2b17b830492ea5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "observacion" DROP CONSTRAINT "FK_8fb9685b9d278ab2e5633a72483"`,
    );
    await queryRunner.query(
      `ALTER TABLE "observacion" DROP CONSTRAINT "FK_eeac18d57278422f9bd21b82a9e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente_insignia" DROP CONSTRAINT "FK_b595afda2c9ade2c2b8532a7713"`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente_insignia" DROP CONSTRAINT "FK_3d899deaa9615cda805098ce4d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resultado_ejercicio" DROP CONSTRAINT "FK_67657479f80ccb1508b6a29ac8c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resultado_ejercicio" DROP CONSTRAINT "FK_51260a156eecfa7025f6fcc9278"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ruta_terapeutica" DROP CONSTRAINT "FK_2f66100f5e232f465627a765259"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ruta_ejercicio" DROP CONSTRAINT "FK_283caefc7287ff0d3f3463c32fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ruta_ejercicio" DROP CONSTRAINT "FK_e6ada2c91de4053ca1b6ea8b646"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejercicio" DROP CONSTRAINT "FK_7873ff437d01c5a6eaedd7fc679"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidencia" DROP CONSTRAINT "FK_fa72306cea1cad2cf72cc4c4d4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente" DROP CONSTRAINT "FK_b00406486306cf8b93da5d3b3a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente" DROP CONSTRAINT "FK_e38aac65e9bef48cfb293f99a05"`,
    );
    await queryRunner.query(
      `ALTER TABLE "especialista" DROP CONSTRAINT "FK_80349ae00410adcb208ba7616e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "administrador" DROP CONSTRAINT "FK_9fc8d6c54afc4893421991ce979"`,
    );
    await queryRunner.query(`DROP TABLE "preferencia_notificacion"`);
    await queryRunner.query(`DROP TABLE "notificacion"`);
    await queryRunner.query(`DROP TYPE "public"."notificacion_tipo_enum"`);
    await queryRunner.query(`DROP TABLE "alerta"`);
    await queryRunner.query(`DROP TYPE "public"."alerta_estado_enum"`);
    await queryRunner.query(`DROP TYPE "public"."alerta_tipo_enum"`);
    await queryRunner.query(`DROP TABLE "observacion"`);
    await queryRunner.query(`DROP TABLE "paciente_insignia"`);
    await queryRunner.query(`DROP TABLE "insignia"`);
    await queryRunner.query(`DROP TABLE "resultado_ejercicio"`);
    await queryRunner.query(`DROP TABLE "ruta_terapeutica"`);
    await queryRunner.query(
      `DROP TYPE "public"."ruta_terapeutica_estado_enum"`,
    );
    await queryRunner.query(`DROP TABLE "ruta_ejercicio"`);
    await queryRunner.query(`DROP TYPE "public"."ruta_ejercicio_estado_enum"`);
    await queryRunner.query(`DROP TABLE "ejercicio"`);
    await queryRunner.query(`DROP TYPE "public"."ejercicio_estado_enum"`);
    await queryRunner.query(`DROP TYPE "public"."ejercicio_categoria_enum"`);
    await queryRunner.query(`DROP TABLE "incidencia"`);
    await queryRunner.query(`DROP TYPE "public"."incidencia_estado_enum"`);
    await queryRunner.query(`DROP TABLE "paciente"`);
    await queryRunner.query(`DROP TABLE "especialista"`);
    await queryRunner.query(`DROP TABLE "administrador"`);
    await queryRunner.query(`DROP TABLE "usuario"`);
    await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum"`);
  }
}
