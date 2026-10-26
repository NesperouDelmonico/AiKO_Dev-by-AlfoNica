import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthUseCase } from '../src/modules/auth/application/use-cases/auth.use-case';
import { GamificationUseCase } from '../src/modules/gamification/application/use-cases/gamification.use-case';
import { EMAIL_PORT } from '../src/modules/shared/application/ports/email.port';
import { PUSH_PORT } from '../src/modules/tracking/domain/ports/push.port';
import { UserEntity, UserRole } from '../src/modules/users/domain/entities/user.entity';
import { PatientEntity } from '../src/modules/users/domain/entities/patient.entity';
import { SpecialistEntity } from '../src/modules/users/domain/entities/specialist.entity';
import {
  CognitiveCategory,
  ExerciseEntity,
} from '../src/modules/therapy/domain/entities/exercise.entity';
import { ExerciseResultEntity } from '../src/modules/therapy/domain/entities/exercise-result.entity';
import { TherapeuticRouteEntity, RouteStatus } from '../src/modules/therapy/domain/entities/therapeutic-route.entity';
import {
  RouteExerciseEntity,
  RouteExerciseStatus,
} from '../src/modules/therapy/domain/entities/route-exercise.entity';
import { AlertEntity, AlertStatus, AlertType } from '../src/modules/tracking/domain/entities/alert.entity';
import * as bcrypt from 'bcrypt';

describe('Complete patient therapy workflow (PostgreSQL e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let bootstrapAdminId: string | undefined;
  const email = { send: jest.fn().mockResolvedValue(undefined) };
  const push = { sendToPatient: jest.fn().mockResolvedValue(undefined) };

  beforeAll(async () => {
    if (process.env.DB_NAME !== 'aiko_test') {
      throw new Error(
        'La suite e2e debe ejecutarse únicamente contra la base descartable aiko_test',
      );
    }
    process.env.JWT_SECRET = 'disposable-e2e-jwt-secret';
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_PORT)
      .useValue(email)
      .overrideProvider(PUSH_PORT)
      .useValue(push)
      .compile();
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
    if (bootstrapAdminId && dataSource?.isInitialized) {
      await dataSource.getRepository(UserEntity).update(bootstrapAdminId, {
        estado: false,
      });
    }
    await app?.close();
  });

  it('runs admin-to-patient therapy, denied admin writes, history, archival, and concurrent route creation', async () => {
    const suffix = randomUUID();
    const adminResponse = await request(app.getHttpServer())
      .post('/v1/usuarios/administrador-inicial')
      .send({
        nombre: `Admin ${suffix}`,
        cedula: `${Date.now()}01`,
        correo: `admin-${suffix}@example.com`,
        contraseña: 'AdminPassword1',
      })
      .expect(201);
    bootstrapAdminId = adminResponse.body.id;
    const jwt = app.get(JwtService);
    const adminToken = await jwt.signAsync(
      { sub: adminResponse.body.id, rol: UserRole.ADMINISTRADOR },
      { jwtid: randomUUID() },
    );

    const specialistResponse = await request(app.getHttpServer())
      .post('/v1/usuarios/especialistas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `Specialist ${suffix}`,
        cedula: `${Date.now()}02`,
        correo: `specialist-${suffix}@example.com`,
      })
      .expect(201);
    expect(specialistResponse.body).toMatchObject({
      id: expect.any(String),
      especialista_id: expect.any(String),
    });
    expect(specialistResponse.body.especialista_id).not.toBe(
      specialistResponse.body.id,
    );
    const specialistToken = await jwt.signAsync(
      { sub: specialistResponse.body.id, rol: UserRole.ESPECIALISTA },
      { jwtid: randomUUID() },
    );
    await request(app.getHttpServer())
      .post(`/v1/usuarios/${specialistResponse.body.id}/restablecer-contrasena`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(403);
    const specialistEntity = await dataSource
      .getRepository(SpecialistEntity)
      .findOneByOrFail({ usuario: { id: specialistResponse.body.id } });
    expect(specialistResponse.body.especialista_id).toBe(specialistEntity.id);
    await request(app.getHttpServer())
      .get(`/v1/usuarios/${specialistResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.especialista_id).toBe(specialistEntity.id);
      });
    await dataSource.getRepository(UserEntity).update(specialistResponse.body.id, {
      estado: false,
      intentosFallidos: 5,
    });
    const oldPasswordHash = (
      await dataSource.getRepository(UserEntity).findOneByOrFail({
        id: specialistResponse.body.id,
      })
    ).contraseñaHash;
    await request(app.getHttpServer())
      .post(`/v1/usuarios/${specialistResponse.body.id}/restablecer-contrasena`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    const resetAccount = await dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({ id: specialistResponse.body.id });
    expect(resetAccount.estado).toBe(true);
    expect(resetAccount.intentosFallidos).toBe(0);
    expect(resetAccount.contraseñaHash).not.toBe(oldPasswordHash);
    const deliveredTemporaryPassword = email.send.mock.calls.at(-1)?.[0].text.match(
      /Contraseña temporal: (.+)\. Cámbiala/,
    )?.[1];
    expect(deliveredTemporaryPassword).toMatch(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/,
    );
    await expect(
      bcrypt.compare(deliveredTemporaryPassword!, resetAccount.contraseñaHash),
    ).resolves.toBe(true);

    await dataSource.getRepository(UserEntity).update(specialistResponse.body.id, {
      estado: false,
      intentosFallidos: 3,
    });
    const beforeFailedDelivery = await dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({ id: specialistResponse.body.id });
    email.send.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await request(app.getHttpServer())
      .post(`/v1/usuarios/${specialistResponse.body.id}/restablecer-contrasena`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(503);
    const afterFailedDelivery = await dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({ id: specialistResponse.body.id });
    expect(afterFailedDelivery.estado).toBe(beforeFailedDelivery.estado);
    expect(afterFailedDelivery.intentosFallidos).toBe(
      beforeFailedDelivery.intentosFallidos,
    );
    expect(afterFailedDelivery.contraseñaHash).toBe(
      beforeFailedDelivery.contraseñaHash,
    );
    await request(app.getHttpServer())
      .patch(`/v1/usuarios/${specialistResponse.body.id}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: true })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/pacientes')
      .set('Authorization', `Bearer ${specialistToken}`)
      .send({
        nombre: `Patient without birth date ${suffix}`,
        cedula: `${Date.now()}98`,
        correo: `missing-birth-${suffix}@example.com`,
        umbral_bajo_rendimiento: 60,
        umbral_dias_inactividad: 7,
      })
      .expect(400);

    const patientResponse = await request(app.getHttpServer())
      .post('/v1/pacientes')
      .set('Authorization', `Bearer ${specialistToken}`)
      .send({
        nombre: `José Patient ${suffix}`,
        cedula: `${Date.now()}03`,
        correo: `patient-${suffix}@example.com`,
        fecha_nacimiento: '1990-06-15',
        umbral_bajo_rendimiento: 60,
        umbral_dias_inactividad: 7,
      })
      .expect(201);
    expect(patientResponse.body).toMatchObject({
      nombre: `José Patient ${suffix}`,
      correo: `patient-${suffix}@example.com`,
      fecha_nacimiento: '1990-06-15',
      estado: true,
      edad: expect.any(Number),
    });
    const secondPatientResponse = await request(app.getHttpServer())
      .post('/v1/pacientes')
      .set('Authorization', `Bearer ${specialistToken}`)
      .send({
        nombre: `José Patient ${suffix} Z`,
        cedula: `${Date.now()}05`,
        correo: `patient-page-${suffix}@example.com`,
        fecha_nacimiento: '1992-06-15',
        umbral_bajo_rendimiento: 60,
        umbral_dias_inactividad: 7,
      })
      .expect(201);
    const patient = await dataSource
      .getRepository(PatientEntity)
      .findOneOrFail({
        where: { id: patientResponse.body.id },
        relations: { usuario: true, especialista: true },
      });
    const patientToken = await jwt.signAsync(
      { sub: patient.usuario.id, rol: UserRole.PACIENTE },
      { jwtid: randomUUID() },
    );
    await request(app.getHttpServer())
      .get(
        `/v1/usuarios?q=JOSE%20PATIENT%20${suffix}&rol=Paciente&estado=true&page=1&limit=10`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        const listedPatientUser = body.data.find(
          (user: { id: string }) => user.id === patient.usuario.id,
        );
        expect(
          body.data.some(
            (user: { id: string }) => user.id === patient.usuario.id,
          ),
        ).toBe(true);
        expect(listedPatientUser.especialista_id).toBeNull();
      });
    await request(app.getHttpServer())
      .get(
        `/v1/usuarios?q=PATIENT-${suffix}%40EXAMPLE.COM&rol=Paciente&estado=true&page=1&limit=10`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.data.some(
            (user: { id: string }) => user.id === patient.usuario.id,
          ),
        ).toBe(true);
      });
    await request(app.getHttpServer())
      .get(`/v1/pacientes/buscar?q=${encodeURIComponent(`Patient ${suffix}`)}&page=1&limit=1`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ total: 2, page: 1, limit: 1 });
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toMatchObject({
          id: patient.id,
          nombre: `José Patient ${suffix}`,
          correo: `patient-${suffix}@example.com`,
          cedula: patient.usuario.cedula,
          estado: true,
          fecha_nacimiento: '1990-06-15',
          edad: expect.any(Number),
          especialista_nombre: `Specialist ${suffix}`,
        });
      });
    await request(app.getHttpServer())
      .get(`/v1/pacientes/buscar?q=${encodeURIComponent(`Patient ${suffix}`)}&page=2&limit=1`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ total: 2, page: 2, limit: 1 });
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe(secondPatientResponse.body.id);
      });
    await request(app.getHttpServer())
      .get(`/v1/pacientes/${patient.id}`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          nombre: `José Patient ${suffix}`,
          correo: `patient-${suffix}@example.com`,
          cedula: patient.usuario.cedula,
          estado: true,
          fecha_nacimiento: '1990-06-15',
          edad: expect.any(Number),
          especialista_nombre: `Specialist ${suffix}`,
        });
      });

    const otherSpecialistResponse = await request(app.getHttpServer())
      .post('/v1/usuarios/especialistas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `Other specialist ${suffix}`,
        cedula: `${Date.now()}04`,
        correo: `other-specialist-${suffix}@example.com`,
      })
      .expect(201);
    expect(otherSpecialistResponse.body.especialista_id).toEqual(
      expect.any(String),
    );
    const listedOtherSpecialist = await request(app.getHttpServer())
      .get(
        `/v1/usuarios?q=${encodeURIComponent(`Other specialist ${suffix}`)}&rol=Especialista`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const otherSpecialistFromList = listedOtherSpecialist.body.data.find(
      (user: { id: string }) => user.id === otherSpecialistResponse.body.id,
    );
    expect(otherSpecialistFromList.especialista_id).toBe(
      otherSpecialistResponse.body.especialista_id,
    );
    const otherSpecialistToken = await jwt.signAsync(
      { sub: otherSpecialistResponse.body.id, rol: UserRole.ESPECIALISTA },
      { jwtid: randomUUID() },
    );
    await request(app.getHttpServer())
      .get(`/v1/pacientes/${patient.id}`)
      .set('Authorization', `Bearer ${otherSpecialistToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/v1/pacientes/${patient.id}`)
      .set('Authorization', `Bearer ${otherSpecialistToken}`)
      .send({ fecha_nacimiento: '1991-06-15' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/v1/pacientes/${patient.id}`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/v1/pacientes/${patient.id}`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .send({ fecha_nacimiento: '1991-06-15', campo_no_declarado: true })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/v1/pacientes/${patient.id}`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .send({ fecha_nacimiento: '1991-06-15' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          nombre: `José Patient ${suffix}`,
          estado: true,
          fecha_nacimiento: '1991-06-15',
          edad: expect.any(Number),
        });
      });
    await request(app.getHttpServer())
      .patch('/v1/pacientes/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${specialistToken}`)
      .send({ fecha_nacimiento: '1991-06-15' })
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/v1/usuarios/${otherSpecialistResponse.body.id}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: false })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/v1/pacientes/${patient.id}/asignacion`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        especialista_id: otherSpecialistFromList.especialista_id,
      })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/v1/pacientes/${patient.id}/asignacion`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ especialista_id: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/v1/usuarios/${otherSpecialistResponse.body.id}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: true })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/v1/pacientes/${patient.id}/asignacion`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        especialista_id: otherSpecialistFromList.especialista_id,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          nombre: `José Patient ${suffix}`,
          estado: true,
          fecha_nacimiento: '1991-06-15',
          especialista_nombre: `Other specialist ${suffix}`,
        });
      });
    await request(app.getHttpServer())
      .patch(`/v1/pacientes/${patient.id}/asignacion`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ especialista_id: specialistEntity.id })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/v1/pacientes/${patient.id}/umbrales`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        umbral_bajo_rendimiento: 65,
        umbral_dias_inactividad: 8,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          nombre: `José Patient ${suffix}`,
          estado: true,
          fecha_nacimiento: '1991-06-15',
        });
      });

    await request(app.getHttpServer())
      .post('/v1/auth/olvide-contrasena')
      .send({ correo: patient.usuario.correo })
      .expect(202);
    const sentCode = email.send.mock.calls.at(-1)?.[0].text.match(
      /: (\d{6})$/,
    )?.[1];
    expect(sentCode).toMatch(/^\d{6}$/);
    const wrongCode = sentCode === '000000' ? '999999' : '000000';
    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app.getHttpServer())
        .post('/v1/auth/restablecer-contrasena')
        .send({
          correo: patient.usuario.correo,
          codigo: wrongCode,
          nueva_contraseña: 'NewPassword1',
        })
        .expect(400);
    }
    await expect(
      app
        .get(AuthUseCase)
        .resetPassword(patient.usuario.correo, sentCode!, 'NewPassword1'),
    ).rejects.toMatchObject({ status: 400 });

    await request(app.getHttpServer())
      .post(`/v1/pacientes/${patient.id}/rutas`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ejercicios: [] })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/v1/pacientes/${patient.id}/observaciones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ texto: 'Este administrador no puede crear la observación' })
      .expect(403);

    const exerciseIds: string[] = [];
    for (const index of [1, 2]) {
      const created = await request(app.getHttpServer())
        .post('/v1/ejercicios')
        .set('Authorization', `Bearer ${specialistToken}`)
        .send({
          nombre: `Exercise ${index} ${suffix}`,
          categoria: CognitiveCategory.ATENCION,
          nivel_dificultad: 1,
          instrucciones: 'Complete el ejercicio de prueba.',
          parametros: {},
        })
        .expect(201);
      exerciseIds.push(created.body.id);
    }

    const createdRoute = await request(app.getHttpServer())
      .post(`/v1/pacientes/${patient.id}/rutas`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .send({
        ejercicios: exerciseIds.map((ejercicio_id, index) => ({
          ejercicio_id,
          orden: index + 1,
        })),
      })
      .expect(201);
    const route = await dataSource
      .getRepository(TherapeuticRouteEntity)
      .findOneByOrFail({ id: createdRoute.body.id });
    const routeItems = await dataSource
      .getRepository(RouteExerciseEntity)
      .find({ where: { ruta: { id: route.id } }, order: { orden: 'ASC' } });

    await dataSource.getRepository(AlertEntity).save(
      dataSource.getRepository(AlertEntity).create({
        paciente: patient,
        tipo: AlertType.INACTIVIDAD,
        estado: AlertStatus.ACTIVA,
      }),
    );
    await request(app.getHttpServer())
      .get('/v1/pacientes')
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        const listedPatient = body.data.find(
          (item: { id: string }) => item.id === patient.id,
        );
        expect(listedPatient).toMatchObject({
          nombre: `José Patient ${suffix}`,
          correo: `patient-${suffix}@example.com`,
          cedula: patient.usuario.cedula,
          estado: true,
          fecha_nacimiento: '1991-06-15',
          edad: expect.any(Number),
          especialista_nombre: `Specialist ${suffix}`,
          alertas_activas: 1,
          progreso_ruta: {
            ruta_id: route.id,
            total: 2,
            completados: 0,
            porcentaje: 0,
          },
        });
      });
    await request(app.getHttpServer())
      .get('/v1/alertas')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toContainEqual(
          expect.objectContaining({
            paciente_id: patient.id,
            paciente_nombre: `José Patient ${suffix}`,
          }),
        );
      });
    await request(app.getHttpServer())
      .get(`/v1/pacientes/${patient.id}/alertas`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toContainEqual(
          expect.objectContaining({
            paciente_id: patient.id,
            paciente_nombre: `José Patient ${suffix}`,
          }),
        );
      });
    await request(app.getHttpServer())
      .get(`/v1/pacientes/buscar?q=${encodeURIComponent(`Patient ${suffix}`)}&page=1&limit=1`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        const listedPatient = body.data.find(
          (item: { id: string }) => item.id === patient.id,
        );
        expect(listedPatient).toMatchObject({
          especialista_nombre: `Specialist ${suffix}`,
          alertas_activas: 1,
          progreso_ruta: {
            ruta_id: route.id,
            total: 2,
            completados: 0,
            porcentaje: 0,
          },
        });
      });
    const gamification = app.get(GamificationUseCase);
    jest
      .spyOn(gamification, 'onExerciseCompleted')
      .mockRejectedValueOnce(new Error('push service unavailable'));
    const approvedResponse = await request(app.getHttpServer())
      .post(
        `/v1/rutas/${route.id}/ejercicios/${routeItems[0].id}/resultados`,
      )
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ puntaje: 80, aciertos: 8, tiempo_reaccion_ms: 5000 })
      .expect(201);
    expect(approvedResponse.body.insignias_obtenidas).toEqual([]);

    const patientAfterApprovedResult = await dataSource
      .getRepository(PatientEntity)
      .findOneByOrFail({ id: patient.id });
    await request(app.getHttpServer())
      .post(
        `/v1/rutas/${route.id}/ejercicios/${routeItems[1].id}/resultados`,
      )
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ puntaje: 59, aciertos: 4 })
      .expect(403);

    const failedAttempt = await dataSource
      .getRepository(ExerciseResultEntity)
      .findOneByOrFail({ rutaEjercicio: { id: routeItems[1].id } });
    expect(failedAttempt.xpGanado).toBe(0);
    const patientAfterLowScore = await dataSource
      .getRepository(PatientEntity)
      .findOneByOrFail({ id: patient.id });
    expect(patientAfterLowScore.xpTotal).toBe(patientAfterApprovedResult.xpTotal);
    expect(patientAfterLowScore.nivelActual).toBe(
      patientAfterApprovedResult.nivelActual,
    );
    expect(
      await dataSource.getRepository(RouteExerciseEntity).findOneByOrFail({
        id: routeItems[1].id,
      }),
    ).toMatchObject({ estado: 'Pendiente' });
    expect(
      await dataSource.getRepository(AlertEntity).findOneByOrFail({
        paciente: { id: patient.id },
        tipo: AlertType.INACTIVIDAD,
      }),
    ).toMatchObject({ estado: AlertStatus.RESUELTA });

    await request(app.getHttpServer())
      .get(`/v1/pacientes/${patient.id}/resultados`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(2);
        expect(body.data.some((result: { xpGanado: number }) => result.xpGanado === 0)).toBe(true);
        expect(body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ejercicio_nombre: expect.stringContaining('Exercise'),
              categoria: CognitiveCategory.ATENCION,
            }),
          ]),
        );
      });
    await request(app.getHttpServer())
      .get(`/v1/pacientes/${patient.id}/historial`)
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.data.every(
            (result: { ejercicio_nombre: string; categoria: string }) =>
              Boolean(result.ejercicio_nombre) &&
              result.categoria === CognitiveCategory.ATENCION,
          ),
        ).toBe(true);
      });
    await request(app.getHttpServer())
      .get(
        `/v1/pacientes/${patient.id}/progreso/dominio?desde=2000-01-01&hasta=2099-12-31`,
      )
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        const category = body.find(
          (item: { categoria: string }) =>
            item.categoria === CognitiveCategory.ATENCION,
        );
        expect(category.ejercicios).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ejercicio_id: exerciseIds[0],
              nombre: expect.stringContaining('Exercise'),
              intentos: 1,
              promedio_puntaje: 80,
              mejor_puntaje: 80,
              ultimo_puntaje: 80,
            }),
            expect.objectContaining({
              ejercicio_id: exerciseIds[1],
              intentos: 1,
              promedio_puntaje: 59,
              mejor_puntaje: 59,
              ultimo_puntaje: 59,
            }),
          ]),
        );
      });
    await request(app.getHttpServer())
      .get(
        `/v1/pacientes/${patient.id}/progreso/dominio?desde=2099-01-01&hasta=2099-01-02`,
      )
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([]);
      });

    await request(app.getHttpServer())
      .post(
        `/v1/rutas/${route.id}/ejercicios/${routeItems[1].id}/resultados`,
      )
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ puntaje: 80, aciertos: 8 })
      .expect(201);
    await expect(
      dataSource.getRepository(TherapeuticRouteEntity).findOneByOrFail({
        id: route.id,
      }),
    ).resolves.toMatchObject({ estado: RouteStatus.HISTORICA });
    await request(app.getHttpServer())
      .get(`/v1/pacientes/${patient.id}/rutas?estado=Histórica&page=1&limit=10`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.data[0].estado).toBe(RouteStatus.HISTORICA);
      });
    await request(app.getHttpServer())
      .get('/v1/pacientes')
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        const listedPatient = body.data.find(
          (item: { id: string }) => item.id === patient.id,
        );
        expect(listedPatient.progreso_ruta).toBeNull();
      });
    await request(app.getHttpServer())
      .get(`/v1/pacientes/${patient.id}/rutas?estado=Invalid`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(400);

    const concurrentResults = await Promise.all([
      request(app.getHttpServer())
        .post(`/v1/pacientes/${patient.id}/rutas`)
        .set('Authorization', `Bearer ${specialistToken}`)
        .send({
          ejercicios: [{ ejercicio_id: exerciseIds[0], orden: 1 }],
        }),
      request(app.getHttpServer())
        .post(`/v1/pacientes/${patient.id}/rutas`)
        .set('Authorization', `Bearer ${specialistToken}`)
        .send({
          ejercicios: [{ ejercicio_id: exerciseIds[1], orden: 1 }],
        }),
    ]);
    expect(concurrentResults.map((response) => response.status).sort()).toEqual(
      [201, 409],
    );
    await request(app.getHttpServer())
      .get(`/v1/pacientes/${patient.id}/rutas?estado=Activa`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.data[0].estado).toBe(RouteStatus.ACTIVA);
      });

    const activeRoute = await dataSource
      .getRepository(TherapeuticRouteEntity)
      .findOneByOrFail({
        paciente: { id: patient.id },
        estado: RouteStatus.ACTIVA,
      });
    const currentRouteItems = await dataSource
      .getRepository(RouteExerciseEntity)
      .find({ where: { ruta: { id: activeRoute.id } } });
    await dataSource.getRepository(RouteExerciseEntity).update(
      currentRouteItems[0].id,
      { estado: RouteExerciseStatus.REEMPLAZADO },
    );
    const completedExercise = await dataSource
      .getRepository(ExerciseEntity)
      .findOneByOrFail({ id: exerciseIds[0] });
    await dataSource.getRepository(RouteExerciseEntity).save(
      dataSource.getRepository(RouteExerciseEntity).create({
        ruta: activeRoute,
        ejercicio: completedExercise,
        orden: 2,
        estado: RouteExerciseStatus.COMPLETADO,
      }),
    );
    await request(app.getHttpServer())
      .get('/v1/pacientes')
      .set('Authorization', `Bearer ${specialistToken}`)
      .expect(200)
      .expect(({ body }) => {
        const listedPatient = body.data.find(
          (item: { id: string }) => item.id === patient.id,
        );
        expect(listedPatient.progreso_ruta).toMatchObject({
          total: 1,
          completados: 1,
          porcentaje: 100,
        });
      });
    expect(specialistEntity.id).toBe(patient.especialista.id);
  }, 90_000);

  it('returns 429 after five login, forgotten-password, and reset-password requests per minute', async () => {
    const loginResponses: { status: number }[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      loginResponses.push(
        await request(app.getHttpServer())
          .post('/v1/auth/login')
          .send({ correo: 'missing@example.com', contraseña: 'WrongPassword1' }),
      );
    }
    expect(loginResponses.at(-1)?.status).toBe(429);

    const forgotResponses: { status: number }[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      forgotResponses.push(
        await request(app.getHttpServer())
          .post('/v1/auth/olvide-contrasena')
          .send({ correo: `missing-${randomUUID()}@example.com` }),
      );
    }
    expect(forgotResponses.at(-1)?.status).toBe(429);

    const resetResponses: { status: number }[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      resetResponses.push(
        await request(app.getHttpServer())
          .post('/v1/auth/restablecer-contrasena')
          .send({
            correo: 'missing@example.com',
            codigo: '000000',
            nueva_contraseña: 'NewPassword1',
          }),
      );
    }
    expect(resetResponses.at(-1)?.status).toBe(429);
  }, 60_000);
});
