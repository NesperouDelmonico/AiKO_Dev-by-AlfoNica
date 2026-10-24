import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
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
import { AlertEntity, AlertStatus, AlertType } from '../src/modules/tracking/domain/entities/alert.entity';
import { ObservationEntity } from '../src/modules/tracking/domain/entities/observation.entity';
import { PatientEntity } from '../src/modules/users/domain/entities/patient.entity';
import { SpecialistEntity } from '../src/modules/users/domain/entities/specialist.entity';
import { UserEntity, UserRole } from '../src/modules/users/domain/entities/user.entity';

type RoleSession = { role: UserRole; token: string };

const forbiddenKeyFragments = [
  'contrasena',
  'password',
  'hash',
  'token_hash',
  'codigo_hash',
];

function normalizedKey(key: string) {
  return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function assertNoSensitiveKeys(
  value: unknown,
  endpoint: string,
  path = '$',
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSensitiveKeys(item, endpoint, `${path}[${index}]`),
    );
    return;
  }
  if (value === null || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    const documentedUserAttempts =
      endpoint.includes('/usuarios') &&
      /^\$\.data\[\d+\]$/.test(path) &&
      normalized === 'intentosfallidos';
    const isSensitive =
      forbiddenKeyFragments.some((fragment) => normalized.includes(fragment)) ||
      (normalized.includes('intentosfallidos') && !documentedUserAttempts);
    if (isSensitive) {
      throw new Error(
        `${endpoint} contiene la clave no permitida ${path}.${key}`,
      );
    }
    assertNoSensitiveKeys(child, endpoint, `${path}.${key}`);
  }
}

function redactValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValues);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, redactValues(child)]),
    );
  }
  return '<REDACTED>';
}

describe('GET response data safety (PostgreSQL e2e)', () => {
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
    const patient = await dataSource
      .getRepository(PatientEntity)
      .save(
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

    const exercise = await dataSource
      .getRepository(ExerciseEntity)
      .save(
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

    const route = await dataSource
      .getRepository(TherapeuticRouteEntity)
      .save(
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

  it('checks principal GET responses for every role and prints redacted alert JSON', async () => {
    const sharedPatientGetPaths = [
      `/pacientes/${patientId}/alertas`,
      `/pacientes/${patientId}/observaciones?page=1&limit=20`,
      `/pacientes/${patientId}/rutas/activa`,
      `/rutas/${routeId}/progreso`,
      `/pacientes/${patientId}/resultados?page=1&limit=20`,
      `/pacientes/${patientId}/historial?page=1&limit=20`,
      `/pacientes/${patientId}/rutas?page=1&limit=20`,
    ];
    const getPathsByRole: Record<UserRole, string[]> = {
      [UserRole.ADMINISTRADOR]: [
        '/usuarios?page=1&limit=100',
        `/pacientes/buscar?page=1&limit=100`,
        `/pacientes/${patientId}`,
        '/alertas',
        '/ejercicios',
        `/ejercicios/${exerciseId}`,
        ...sharedPatientGetPaths,
      ],
      [UserRole.ESPECIALISTA]: [
        '/pacientes?page=1&limit=100',
        `/pacientes/buscar?page=1&limit=100`,
        `/pacientes/${patientId}`,
        '/alertas',
        '/ejercicios',
        `/ejercicios/${exerciseId}`,
        ...sharedPatientGetPaths,
      ],
      [UserRole.PACIENTE]: [
        '/ejercicios',
        `/ejercicios/${exerciseId}`,
        ...sharedPatientGetPaths,
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
        assertNoSensitiveKeys(response.body, path);

        if (path === '/alertas' || path.endsWith('/alertas')) {
          process.stdout.write(
            `REDACTED_ALERT_JSON ${session.role} GET ${path.replace(
              patientId,
              '<REDACTED>',
            )}: ${JSON.stringify(redactValues(response.body))}\n`,
          );
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
});
