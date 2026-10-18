import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AdministratorEntity } from '../src/modules/users/domain/entities/administrator.entity';
import {
  UserEntity,
  UserRole,
} from '../src/modules/users/domain/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Auth and administrator state (PostgreSQL e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let administratorIds: string[] = [];

  beforeAll(async () => {
    if (process.env.DB_NAME !== 'aiko_test') {
      throw new Error(
        'La suite e2e debe ejecutarse únicamente contra la base descartable aiko_test',
      );
    }
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    dataSource = app.get(DataSource);
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized && administratorIds.length) {
      await dataSource.getRepository(UserEntity).delete(administratorIds);
    }
    await app?.close();
  });

  it('serializa dos desactivaciones concurrentes y preserva el último administrador', async () => {
    const users = await dataSource.getRepository(UserEntity).save(
      [
        {
          nombre: `Admin uno ${randomUUID()}`,
          cedula: `${Date.now()}01`,
          correo: `${randomUUID()}@example.com`,
          contraseñaHash: await bcrypt.hash('AdminPassword1', 4),
          rol: UserRole.ADMINISTRADOR,
          estado: true,
          intentosFallidos: 0,
        },
        {
          nombre: `Admin dos ${randomUUID()}`,
          cedula: `${Date.now()}02`,
          correo: `${randomUUID()}@example.com`,
          contraseñaHash: await bcrypt.hash('AdminPassword1', 4),
          rol: UserRole.ADMINISTRADOR,
          estado: true,
          intentosFallidos: 0,
        },
      ].map((user) => dataSource.getRepository(UserEntity).create(user)),
    );
    administratorIds.push(...users.map((user) => user.id));
    await dataSource
      .getRepository(AdministratorEntity)
      .save(
        users.map((usuario) =>
          dataSource.getRepository(AdministratorEntity).create({ usuario }),
        ),
      );

    const jwt = app.get(JwtService);
    const tokens = await Promise.all(
      users.map((user) =>
        jwt.signAsync(
          { sub: user.id, rol: UserRole.ADMINISTRADOR },
          { jwtid: randomUUID() },
        ),
      ),
    );
    const results = await Promise.all(
      users.map((user, index) =>
        request(app.getHttpServer())
          .patch(`/v1/usuarios/${user.id}/estado`)
          .set('Authorization', `Bearer ${tokens[1 - index]}`)
          .send({ estado: false }),
      ),
    );

    expect(results.filter((response) => response.status === 200)).toHaveLength(
      1,
    );
    expect(
      results.some(
        (response) => response.status === 409 || response.status === 401,
      ),
    ).toBe(true);
    const stillActive = await dataSource.getRepository(UserEntity).count({
      where: { rol: UserRole.ADMINISTRADOR, estado: true },
    });
    expect(stillActive).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('responde igual a una solicitud de recuperación para un correo inexistente', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/olvide-contrasena')
      .send({ correo: 'missing@example.com' })
      .expect(202)
      .expect({
        mensaje: 'Si la cuenta existe, recibirás instrucciones por correo',
      });
  });

  it('reactivar una cuenta reinicia intentos_fallidos en la base', async () => {
    const user = await dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        nombre: `Admin bloqueado ${randomUUID()}`,
        cedula: `${Date.now()}03`,
        correo: `${randomUUID()}@example.com`,
        contraseñaHash: await bcrypt.hash('AdminPassword1', 4),
        rol: UserRole.ADMINISTRADOR,
        estado: false,
        intentosFallidos: 5,
      }),
    );
    administratorIds.push(user.id);
    await dataSource
      .getRepository(AdministratorEntity)
      .save(
        dataSource.getRepository(AdministratorEntity).create({ usuario: user }),
      );
    const actor = await dataSource.getRepository(UserEntity).findOneByOrFail({
      rol: UserRole.ADMINISTRADOR,
      estado: true,
    });
    const token = await app
      .get(JwtService)
      .signAsync(
        { sub: actor.id, rol: UserRole.ADMINISTRADOR },
        { jwtid: randomUUID() },
      );

    await request(app.getHttpServer())
      .patch(`/v1/usuarios/${user.id}/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: true })
      .expect(200);

    const reactivated = await dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({ id: user.id });
    expect(reactivated.estado).toBe(true);
    expect(reactivated.intentosFallidos).toBe(0);
  }, 30_000);
});
