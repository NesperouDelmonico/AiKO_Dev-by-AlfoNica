import { INestApplication, ValidationPipe } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { EMAIL_PORT } from '../src/modules/shared/application/ports/email.port';
import {
  CognitiveCategory,
  ExerciseEntity,
  ExerciseStatus,
  GameType,
} from '../src/modules/therapy/domain/entities/exercise.entity';
import { ExerciseResultEntity } from '../src/modules/therapy/domain/entities/exercise-result.entity';
import {
  RouteExerciseEntity,
  RouteExerciseStatus,
} from '../src/modules/therapy/domain/entities/route-exercise.entity';
import {
  RouteStatus,
  TherapeuticRouteEntity,
} from '../src/modules/therapy/domain/entities/therapeutic-route.entity';
import { BadgeEntity } from '../src/modules/gamification/domain/entities/badge.entity';
import { PatientBadgeEntity } from '../src/modules/gamification/domain/entities/patient-badge.entity';
import {
  AlertEntity,
  AlertStatus,
  AlertType,
} from '../src/modules/tracking/domain/entities/alert.entity';
import { ObservationEntity } from '../src/modules/tracking/domain/entities/observation.entity';
import {
  NotificationEntity,
  NotificationType,
} from '../src/modules/tracking/domain/entities/notification.entity';
import {
  NotificationPreferenceEntity,
  ReminderFrequency,
} from '../src/modules/tracking/domain/entities/notification-preference.entity';
import { PatientEntity } from '../src/modules/users/domain/entities/patient.entity';
import { SpecialistEntity } from '../src/modules/users/domain/entities/specialist.entity';
import {
  UserEntity,
  UserRole,
} from '../src/modules/users/domain/entities/user.entity';

type RoleSession = { role: UserRole; token: string };

type JsonObject = Record<string, unknown>;
type ResponseShape =
  | { kind: 'object'; properties: Record<string, ResponseShape> }
  | { kind: 'array'; items: ResponseShape }
  | { kind: 'scalar' };

type YamlLoader = { load(source: string): unknown };
type OpenApiDocument = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
};

const yaml = require('js-yaml') as YamlLoader;
const contract = yaml.load(
  readFileSync(join(__dirname, '../docs/aiko-openapi__1_.yaml'), 'utf8'),
) as OpenApiDocument;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function camelToSnake(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function responseShape(
  schema: unknown,
  refs = new Set<string>(),
): ResponseShape {
  if (!isObject(schema)) return { kind: 'scalar' };
  const ref = schema.$ref;
  if (typeof ref === 'string') {
    if (refs.has(ref)) return { kind: 'object', properties: {} };
    const name = ref.split('/').pop();
    if (!name || !(name in contract.components.schemas)) {
      throw new Error(`$ref de respuesta no resuelto: ${ref}`);
    }
    const nextRefs = new Set(refs).add(ref);
    return responseShape(contract.components.schemas[name], nextRefs);
  }
  if (Array.isArray(schema.allOf)) {
    const properties: Record<string, ResponseShape> = {};
    for (const part of schema.allOf) {
      const partShape = responseShape(part, refs);
      if (partShape.kind === 'object') {
        Object.assign(properties, partShape.properties);
      }
    }
    return { kind: 'object', properties };
  }
  if (schema.type === 'array') {
    return { kind: 'array', items: responseShape(schema.items, refs) };
  }
  if (schema.type === 'object' || isObject(schema.properties)) {
    const properties = isObject(schema.properties) ? schema.properties : {};
    return {
      kind: 'object',
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [
          key,
          responseShape(value, refs),
        ]),
      ),
    };
  }
  return { kind: 'scalar' };
}

function operationShape(
  method: string,
  path: string,
  status: number,
): ResponseShape {
  const actual = path.split('?')[0].split('/');
  const matchedPath = Object.keys(contract.paths).find((candidate) => {
    const expected = candidate.split('/');
    return (
      actual.length === expected.length &&
      expected.every(
        (segment, index) =>
          segment.startsWith('{') || segment === actual[index],
      )
    );
  });
  if (!matchedPath) throw new Error(`${method} ${path} no está en OpenAPI`);
  const operation = contract.paths[matchedPath][method.toLowerCase()];
  if (!isObject(operation))
    throw new Error(`${method} ${matchedPath} no está documentado`);
  const responses = operation.responses;
  const response = isObject(responses) ? responses[String(status)] : undefined;
  if (!isObject(response)) {
    throw new Error(
      `${method} ${matchedPath} no documenta respuesta ${status}`,
    );
  }
  const content = response.content;
  if (content === undefined) return { kind: 'object', properties: {} };
  if (!isObject(content) || !isObject(content['application/json'])) {
    throw new Error(`${method} ${matchedPath} no documenta JSON`);
  }
  const body = content['application/json'].schema;
  return responseShape(body);
}

function normalizedKey(key: string) {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const forbiddenKeyFragments = [
  'hash',
  'contrasena',
  'password',
  'token_hash',
  'codigo_hash',
];

function assertResponseShape(
  value: unknown,
  shape: ResponseShape,
  endpoint: string,
  path = '$',
) {
  if (value === null) return;
  if (shape.kind === 'array') {
    if (!Array.isArray(value))
      throw new Error(`${endpoint} ${path} debe ser arreglo`);
    value.forEach((item, index) =>
      assertResponseShape(item, shape.items, endpoint, `${path}[${index}]`),
    );
    return;
  }
  if (shape.kind === 'object') {
    if (!isObject(value))
      throw new Error(`${endpoint} ${path} debe ser objeto`);
    for (const [key, child] of Object.entries(value)) {
      const declaredKey = key in shape.properties ? key : camelToSnake(key);
      const childShape = shape.properties[declaredKey];
      const normalized = normalizedKey(key);
      const isDocumentedFailedAttempts =
        normalized === 'intentosfallidos' && childShape !== undefined;
      if (
        forbiddenKeyFragments.some((fragment) =>
          normalized.includes(fragment),
        ) &&
        !isDocumentedFailedAttempts
      ) {
        throw new Error(`${endpoint} contiene clave prohibida ${path}.${key}`);
      }
      if (!childShape) {
        throw new Error(
          `${endpoint} contiene la clave no permitida ${path}.${key}`,
        );
      }
      assertResponseShape(child, childShape, endpoint, `${path}.${key}`);
    }
  }
}

function assertOperationResponse(
  method: string,
  path: string,
  response: request.Response,
) {
  if (response.status === 204) return;
  assertResponseShape(
    response.body,
    operationShape(method, path, response.status),
    `${method} ${path}`,
  );
}

describe('Response data safety (PostgreSQL e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let patientId: string;
  let exerciseId: string;
  let routeId: string;
  let roleSessions: RoleSession[];

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
      .useValue({ send: jest.fn().mockResolvedValue(undefined) })
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

    const suffix = randomUUID();
    const users = dataSource.getRepository(UserEntity);
    const createUser = (role: UserRole, name: string, index: number) =>
      users.save(
        users.create({
          nombre: `${name} ${suffix}`,
          cedula: `${Date.now()}${index}`,
          correo: `${name.toLowerCase()}-${suffix}@example.com`,
          contraseñaHash: '$2b$04$fixture-only-not-a-real-password-hash',
          rol: role,
          estado: true,
          intentosFallidos: 0,
        }),
      );
    const [admin, specialistUser, patientUser] = await Promise.all([
      createUser(UserRole.ADMINISTRADOR, 'Admin', 11),
      createUser(UserRole.ESPECIALISTA, 'Specialist', 12),
      createUser(UserRole.PACIENTE, 'Patient', 13),
    ]);
    const specialist = await dataSource
      .getRepository(SpecialistEntity)
      .save(
        dataSource
          .getRepository(SpecialistEntity)
          .create({ usuario: specialistUser }),
      );
    const patient = await dataSource.getRepository(PatientEntity).save(
      dataSource.getRepository(PatientEntity).create({
        usuario: patientUser,
        especialista: specialist,
        xpTotal: 0,
        nivelActual: 1,
        umbralBajoRendimiento: 60,
        umbralDiasInactividad: 7,
        fechaNacimiento: '1990-06-15',
        fechaAsignacion: new Date().toISOString().slice(0, 10),
      }),
    );
    patientId = patient.id;

    const exercise = await dataSource.getRepository(ExerciseEntity).save(
      dataSource.getRepository(ExerciseEntity).create({
        nombre: `Exercise ${suffix}`,
        categoria: CognitiveCategory.MEMORIA,
        tipo: GameType.MEMORIA_SECUENCIAS,
        instrucciones: 'Complete el ejercicio de prueba.',
        parametros: {},
        nivelDificultad: 1,
        estado: ExerciseStatus.ACTIVO,
        especialista: specialist,
      }),
    );
    exerciseId = exercise.id;

    const route = await dataSource.getRepository(TherapeuticRouteEntity).save(
      dataSource.getRepository(TherapeuticRouteEntity).create({
        paciente: patient,
        estado: RouteStatus.ACTIVA,
        duracionDias: 1,
      }),
    );
    routeId = route.id;
    const routeExercise = await dataSource
      .getRepository(RouteExerciseEntity)
      .save(
        dataSource.getRepository(RouteExerciseEntity).create({
          ruta: route,
          ejercicio: exercise,
          orden: 1,
          dia: 1,
          estado: RouteExerciseStatus.PENDIENTE,
          fechaCompletado: null,
        }),
      );
    await dataSource.getRepository(ExerciseResultEntity).save(
      dataSource.getRepository(ExerciseResultEntity).create({
        paciente: patient,
        rutaEjercicio: routeExercise,
        puntaje: 80,
        tiempoReaccionMs: null,
        aciertos: 8,
        xpGanado: 0,
      }),
    );
    await dataSource.getRepository(ObservationEntity).save(
      dataSource.getRepository(ObservationEntity).create({
        paciente: patient,
        especialista: specialist,
        texto: 'Observación de prueba clínica.',
      }),
    );
    await dataSource.getRepository(AlertEntity).save(
      dataSource.getRepository(AlertEntity).create({
        paciente: patient,
        tipo: AlertType.INACTIVIDAD,
        estado: AlertStatus.ACTIVA,
      }),
    );
    const badge = await dataSource.getRepository(BadgeEntity).save(
      dataSource.getRepository(BadgeEntity).create({
        nombre: `Badge ${suffix}`,
        descripcion: 'Insignia e2e.',
        condicion: 'sesiones >= 1',
      }),
    );
    await dataSource.getRepository(PatientBadgeEntity).save(
      dataSource.getRepository(PatientBadgeEntity).create({
        paciente: patient,
        insignia: badge,
      }),
    );
    await dataSource.getRepository(NotificationEntity).save(
      dataSource.getRepository(NotificationEntity).create({
        paciente: patient,
        tipo: NotificationType.RECORDATORIO,
        mensaje: 'Recordatorio e2e.',
        leida: false,
      }),
    );
    await dataSource.getRepository(NotificationPreferenceEntity).save(
      dataSource.getRepository(NotificationPreferenceEntity).create({
        pacienteId: patient.id,
        frecuencia: ReminderFrequency.DIARIA,
        horarioRecordatorio: '09:00',
      }),
    );

    const jwt = app.get(JwtService);
    roleSessions = await Promise.all(
      [
        { user: admin, role: UserRole.ADMINISTRADOR },
        { user: specialistUser, role: UserRole.ESPECIALISTA },
        { user: patientUser, role: UserRole.PACIENTE },
      ].map(async ({ user, role }) => ({
        role,
        token: await jwt.signAsync(
          { sub: user.id, rol: role },
          { jwtid: randomUUID() },
        ),
      })),
    );
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('rejects GET response keys not declared by OpenAPI for every role', async () => {
    const sharedPatientGetPaths = [
      `/pacientes/${patientId}/alertas`,
      `/pacientes/${patientId}/observaciones?page=1&limit=20`,
      `/pacientes/${patientId}/rutas/activa`,
      `/rutas/${routeId}/progreso`,
      `/pacientes/${patientId}/resultados?page=1&limit=20`,
      `/pacientes/${patientId}/historial?page=1&limit=20`,
      `/pacientes/${patientId}/rutas?page=1&limit=20`,
      `/pacientes/${patientId}/perfil-logros`,
      `/pacientes/${patientId}/insignias`,
      `/pacientes/${patientId}/contenido-desbloqueado`,
    ];
    const getPathsByRole: Record<UserRole, string[]> = {
      [UserRole.ADMINISTRADOR]: [
        '/auth/me',
        '/usuarios?page=1&limit=100',
        `/pacientes/buscar?page=1&limit=100`,
        `/pacientes/${patientId}`,
        '/alertas',
        '/insignias',
        '/ejercicios',
        `/ejercicios/${exerciseId}`,
        ...sharedPatientGetPaths,
      ],
      [UserRole.ESPECIALISTA]: [
        '/auth/me',
        '/pacientes?page=1&limit=100',
        `/pacientes/buscar?page=1&limit=100`,
        `/pacientes/${patientId}`,
        '/alertas',
        '/insignias',
        '/ejercicios',
        `/ejercicios/${exerciseId}`,
        ...sharedPatientGetPaths,
      ],
      [UserRole.PACIENTE]: [
        '/auth/me',
        '/ejercicios',
        `/ejercicios/${exerciseId}`,
        '/insignias',
        ...sharedPatientGetPaths,
        `/pacientes/${patientId}/notificaciones?page=1&limit=20`,
        `/pacientes/${patientId}/preferencia-notificacion`,
      ],
    };

    for (const session of roleSessions) {
      for (const path of getPathsByRole[session.role]) {
        const response = await request(app.getHttpServer())
          .get(`/v1${path}`)
          .set('Authorization', `Bearer ${session.token}`);
        if (response.status !== 200) {
          throw new Error(
            `${session.role} GET ${path} respondió ${response.status}: ${JSON.stringify(response.body)}`,
          );
        }
        assertOperationResponse('GET', path, response);

        if (path === '/alertas' || path.endsWith('/alertas')) {
          expect(response.body[0]).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              paciente_id: patientId,
              paciente_nombre: expect.any(String),
              tipo: AlertType.INACTIVIDAD,
              estado: AlertStatus.ACTIVA,
              fecha_generada: expect.any(String),
            }),
          );
          expect(Object.keys(response.body[0]).sort()).toEqual(
            [
              'estado',
              'fecha_generada',
              'id',
              'paciente_id',
              'paciente_nombre',
              'tipo',
            ].sort(),
          );
        }
      }
    }
  }, 60_000);

  it('rejects undocumented keys on principal write responses', async () => {
    const specialist = roleSessions.find(
      (session) => session.role === UserRole.ESPECIALISTA,
    )!;
    const patient = roleSessions.find(
      (session) => session.role === UserRole.PACIENTE,
    )!;
    const specialistAuth = `Bearer ${specialist.token}`;
    const patientAuth = `Bearer ${patient.token}`;
    const suffix = randomUUID();

    const createdObservation = await request(app.getHttpServer())
      .post(`/v1/pacientes/${patientId}/observaciones`)
      .set('Authorization', specialistAuth)
      .send({ texto: 'Observación creada por prueba e2e.' })
      .expect(201);
    assertOperationResponse(
      'POST',
      `/pacientes/${patientId}/observaciones`,
      createdObservation,
    );
    const observationPath = `/observaciones/${createdObservation.body.id}`;
    const updatedObservation = await request(app.getHttpServer())
      .put(`/v1${observationPath}`)
      .set('Authorization', specialistAuth)
      .send({ texto: 'Observación actualizada por prueba e2e.' })
      .expect(200);
    assertOperationResponse('PUT', observationPath, updatedObservation);

    const exercisePayload = {
      nombre: `Escritura segura ${suffix}`,
      categoria: CognitiveCategory.ATENCION,
      nivel_dificultad: 1,
      instrucciones: 'Complete este ejercicio e2e.',
      parametros: {},
    };
    const createdExercise = await request(app.getHttpServer())
      .post('/v1/ejercicios')
      .set('Authorization', specialistAuth)
      .send(exercisePayload)
      .expect(201);
    assertOperationResponse('POST', '/ejercicios', createdExercise);
    const exercisePath = `/ejercicios/${createdExercise.body.id}`;
    const updatedExercise = await request(app.getHttpServer())
      .put(`/v1${exercisePath}`)
      .set('Authorization', specialistAuth)
      .send({ nombre: `Ejercicio editado ${suffix}` })
      .expect(200);
    assertOperationResponse('PUT', exercisePath, updatedExercise);

    await dataSource.getRepository(TherapeuticRouteEntity).update(routeId, {
      estado: RouteStatus.HISTORICA,
    });
    const createdRoute = await request(app.getHttpServer())
      .post(`/v1/pacientes/${patientId}/rutas`)
      .set('Authorization', specialistAuth)
      .send({
        ejercicios: [
          { ejercicio_id: createdExercise.body.id, orden: 1, dia: 1 },
        ],
        duracion_dias: 1,
      })
      .expect(201);
    assertOperationResponse(
      'POST',
      `/pacientes/${patientId}/rutas`,
      createdRoute,
    );
    const routePath = `/rutas/${createdRoute.body.id}/ejercicios`;
    const added = await request(app.getHttpServer())
      .post(`/v1${routePath}`)
      .set('Authorization', specialistAuth)
      .send({
        ejercicio_id: exerciseId,
        orden: 2,
        dia: 1,
      })
      .expect(201);
    assertOperationResponse('POST', routePath, added);

    const replacementExercise = await request(app.getHttpServer())
      .post('/v1/ejercicios')
      .set('Authorization', specialistAuth)
      .send({ ...exercisePayload, nombre: `Reemplazo ${suffix}` })
      .expect(201);
    assertOperationResponse('POST', '/ejercicios', replacementExercise);
    const replacePath = `${routePath}/${added.body.id}/reemplazar`;
    const replaced = await request(app.getHttpServer())
      .patch(`/v1${replacePath}`)
      .set('Authorization', specialistAuth)
      .send({ nuevo_ejercicio_id: replacementExercise.body.id })
      .expect(200);
    assertOperationResponse('PATCH', replacePath, replaced);

    const deletePath = `${routePath}/${added.body.id}`;
    await request(app.getHttpServer())
      .delete(`/v1${deletePath}`)
      .set('Authorization', specialistAuth)
      .expect(204);

    const notification = await dataSource
      .getRepository(NotificationEntity)
      .findOneByOrFail({ paciente: { id: patientId } });
    const readPath = `/notificaciones/${notification.id}/leida`;
    const markedRead = await request(app.getHttpServer())
      .patch(`/v1${readPath}`)
      .set('Authorization', patientAuth)
      .expect(200);
    assertOperationResponse('PATCH', readPath, markedRead);

    const createdPatient = await request(app.getHttpServer())
      .post('/v1/pacientes')
      .set('Authorization', specialistAuth)
      .send({
        nombre: `Nuevo paciente ${suffix}`,
        cedula: `${Date.now()}99`,
        correo: `new-patient-${suffix}@example.com`,
        fecha_nacimiento: '1990-06-15',
        umbral_bajo_rendimiento: 60,
        umbral_dias_inactividad: 7,
      })
      .expect(201);
    assertOperationResponse('POST', '/pacientes', createdPatient);
    const thresholdsPath = `/pacientes/${createdPatient.body.id}/umbrales`;
    const thresholds = await request(app.getHttpServer())
      .put(`/v1${thresholdsPath}`)
      .set('Authorization', specialistAuth)
      .send({
        umbral_bajo_rendimiento: 65,
        umbral_dias_inactividad: 8,
      })
      .expect(200);
    assertOperationResponse('PUT', thresholdsPath, thresholds);
  }, 60_000);
});
