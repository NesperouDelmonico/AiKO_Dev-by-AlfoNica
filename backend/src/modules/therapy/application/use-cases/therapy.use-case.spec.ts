import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { TherapyUseCase } from './therapy.use-case';
import type { TherapyRepositoryPort } from '../../domain/ports/therapy.repository.port';
import {
  CognitiveCategory,
  ExerciseEntity,
  ExerciseStatus,
  GameType,
} from '../../domain/entities/exercise.entity';
import {
  RouteExerciseEntity,
  RouteExerciseStatus,
} from '../../domain/entities/route-exercise.entity';
import {
  RouteStatus,
  TherapeuticRouteEntity,
} from '../../domain/entities/therapeutic-route.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { UserRole } from '../../../users/domain/entities/user.entity';
import type { GamificationUseCase } from '../../../gamification/application/use-cases/gamification.use-case';

describe('TherapyUseCase.result', () => {
  const repository = {
    exercises: jest.fn(),
    exercise: jest.fn(),
    specialistIdForUser: jest.fn(),
    patientForUser: jest.fn(),
    patientById: jest.fn(),
    patientAssignedToSpecialist: jest.fn(),
    routeExists: jest.fn(),
    routePatientId: jest.fn(),
    routeIsActive: jest.fn(),
    routeExerciseCount: jest.fn(),
    exerciseAvailableForPatient: jest.fn(),
    saveExercise: jest.fn(),
    exerciseOwnedBySpecialist: jest.fn(),
    updateExercise: jest.fn(),
    activeUsage: jest.fn(),
    createRoute: jest.fn(),
    activeRoute: jest.fn(),
    progress: jest.fn(),
    addRouteExercise: jest.fn(),
    routeExercise: jest.fn(),
    routeExerciseInRoute: jest.fn(),
    removeRouteExercise: jest.fn(),
    resequenceRoute: jest.fn(),
    replaceRouteExercise: jest.fn(),
    saveResult: jest.fn(),
    results: jest.fn(),
    resultsPage: jest.fn(),
    routesHistory: jest.fn(),
    domainProgress: jest.fn(),
    temporalProgress: jest.fn(),
  } as jest.Mocked<TherapyRepositoryPort>;
  const configValues: Record<string, string | number> = {
    MIN_SCORE_TO_ADVANCE: 60,
    XP_REFERENCE_TIME_MS: 10000,
    XP_PRECISION_DIVISOR: 10,
    XP_SPEED_BONUS_MAX: 5,
    XP_PER_LEVEL: 100,
  };
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  } as unknown as ConfigService;
  const gamification = {
    onExerciseCompleted: jest.fn(),
  } as unknown as jest.Mocked<GamificationUseCase>;
  const patient = Object.assign(new PatientEntity(), {
    id: 'patient-id',
    nivelActual: 1,
    xpTotal: 0,
  });
  const route = Object.assign(new TherapeuticRouteEntity(), {
    id: 'route-id',
    estado: RouteStatus.ACTIVA,
    paciente: patient,
  });
  const item = Object.assign(new RouteExerciseEntity(), {
    id: 'route-exercise-id',
    ruta: route,
    estado: RouteExerciseStatus.PENDIENTE,
  });
  const savedResult = { id: 'result-id', xpGanado: 10 };
  const useCase = new TherapyUseCase(repository, config, gamification);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.saveExercise.mockImplementation(async (data) =>
      Object.assign(new ExerciseEntity(), data, {
        id: 'exercise-id',
        fechaCreacion: new Date(),
        especialista: { id: 'specialist-id' },
      }),
    );
    repository.patientForUser.mockResolvedValue(patient);
    repository.routeExerciseInRoute.mockResolvedValue(item);
    repository.saveResult.mockResolvedValue(savedResult as never);
    gamification.onExerciseCompleted.mockResolvedValue([]);
  });

  it('normaliza XP config entregada como strings y conserva el cálculo numérico', async () => {
    const input = { puntaje: 80, tiempo_reaccion_ms: 5000, aciertos: 8 };
    await useCase.result(route.id, item.id, input, 'patient-user');
    const xpFromStrings = repository.saveResult.mock.calls[0][2].xpGanado;

    Object.assign(configValues, {
      MIN_SCORE_TO_ADVANCE: '60',
      XP_REFERENCE_TIME_MS: '10000',
      XP_PRECISION_DIVISOR: '10',
      XP_SPEED_BONUS_MAX: '5',
      XP_PER_LEVEL: '100',
    });
    repository.saveResult.mockClear();
    await useCase.result(route.id, item.id, input, 'patient-user');

    expect(repository.saveResult.mock.calls[0][2].xpGanado).toBe(xpFromStrings);
  });

  it('persiste puntaje bajo con cero XP y Pendiente sin ejecutar gamificación, luego responde 403', async () => {
    await expect(
      useCase.result(
        route.id,
        item.id,
        { puntaje: 59, aciertos: 4 },
        'patient-user',
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(repository.saveResult).toHaveBeenCalledWith(
      item.id,
      patient.id,
      expect.objectContaining({ xpGanado: 0 }),
      false,
    );
    expect(gamification.onExerciseCompleted).not.toHaveBeenCalled();
  });

  it('pasa al repositorio un resultado exitoso con avance habilitado', async () => {
    await useCase.result(
      route.id,
      item.id,
      { puntaje: 80, aciertos: 8 },
      'patient-user',
    );

    expect(repository.saveResult).toHaveBeenCalledWith(
      item.id,
      patient.id,
      expect.any(Object),
      true,
    );
  });

  it('devuelve 201 shape con insignias vacías cuando falla gamificación', async () => {
    gamification.onExerciseCompleted.mockRejectedValue(
      new Error('push service unavailable'),
    );

    await expect(
      useCase.result(
        route.id,
        item.id,
        { puntaje: 90, aciertos: 9 },
        'patient-user',
      ),
    ).resolves.toMatchObject({ insignias_obtenidas: [] });
  });

  describe('días de la ruta', () => {
    const exercise = Object.assign(new ExerciseEntity(), {
      id: 'e',
      estado: ExerciseStatus.ACTIVO,
      nivelDificultad: 1,
    });

    beforeEach(() => {
      repository.patientAssignedToSpecialist.mockResolvedValue(true);
      repository.patientById.mockResolvedValue(patient);
      repository.exercise.mockResolvedValue(exercise);
      repository.createRoute.mockResolvedValue(route);
    });

    it('usa día 1 por defecto y pasa los días al repositorio', async () => {
      await useCase.route(
        patient.id,
        [
          { ejercicioId: 'a', orden: 1 },
          { ejercicioId: 'b', orden: 2, dia: 1 },
          { ejercicioId: 'c', orden: 3, dia: 2 },
        ],
        'specialist-user',
      );
      expect(repository.createRoute).toHaveBeenCalledWith(
        patient.id,
        [
          { ejercicioId: 'a', orden: 1, dia: 1 },
          { ejercicioId: 'b', orden: 2, dia: 1 },
          { ejercicioId: 'c', orden: 3, dia: 2 },
        ],
        2,
      );
    });

    it.each([[[2, 2]], [[1, 3]], [[2, 1]]])('rechaza días %j', async (days) => {
      await expect(
        useCase.route(
          patient.id,
          days.map((dia, index) => ({
            ejercicioId: `e${index}`,
            orden: index + 1,
            dia,
          })),
          'specialist-user',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.createRoute).not.toHaveBeenCalled();
    });

    it('exige que el periodo elegido tenga ejercicios en todos sus días', async () => {
      await expect(
        useCase.route(
          patient.id,
          [
            { ejercicioId: 'a', orden: 1, dia: 1 },
            { ejercicioId: 'a', orden: 2, dia: 2 },
          ],
          'specialist-user',
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await useCase.route(
        patient.id,
        [
          { ejercicioId: 'a', orden: 1, dia: 1 },
          { ejercicioId: 'a', orden: 2, dia: 1 },
        ],
        'specialist-user',
        1,
      );
      expect(repository.createRoute).toHaveBeenLastCalledWith(
        patient.id,
        expect.any(Array),
        1,
      );
      // Ejercicio repetido: se consulta una sola vez.
      expect(repository.exercise).toHaveBeenCalledTimes(1);
    });
  });

  describe('parámetros de ejercicio', () => {
    it('rechaza parámetros fuera de rango al crear', async () => {
      await expect(
        useCase.create(
          {
            nombre: 'Atención',
            categoria: CognitiveCategory.ATENCION,
            nivel_dificultad: 1,
            instrucciones: 'Toca el círculo',
            parametros: { duracion_segundos: 5 },
          },
          'specialist-user',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.saveExercise).not.toHaveBeenCalled();
    });

    it('deduce el tipo de la categoría y respeta el tipo elegido', async () => {
      await useCase.create(
        {
          nombre: 'Reacción',
          categoria: CognitiveCategory.VELOCIDAD,
          nivel_dificultad: 1,
          instrucciones: 'Toca rápido',
          parametros: {},
        },
        'specialist-user',
      );
      expect(repository.saveExercise).toHaveBeenLastCalledWith(
        expect.objectContaining({ tipo: GameType.REACCION }),
        'specialist-user',
      );
      await useCase.create(
        {
          nombre: 'Problemas',
          categoria: CognitiveCategory.ATENCION,
          tipo: GameType.LOGICA,
          nivel_dificultad: 1,
          instrucciones: 'Elige la respuesta',
          parametros: {
            preguntas: [
              {
                enunciado: '¿Cuánto es 2 + 2?',
                opciones: ['3', '4'],
                correcta: 1,
              },
            ],
          },
        },
        'specialist-user',
      );
      expect(repository.saveExercise).toHaveBeenLastCalledWith(
        expect.objectContaining({ tipo: GameType.LOGICA }),
        'specialist-user',
      );
    });

    it('rechaza imágenes que no existen', async () => {
      const images = { missing: jest.fn().mockResolvedValue(['x']) };
      const withImages = new TherapyUseCase(
        repository,
        config,
        gamification,
        images as never,
      );
      await expect(
        withImages.create(
          {
            nombre: 'Palabras',
            categoria: CognitiveCategory.MEMORIA,
            tipo: GameType.COMPLETAR_PALABRAS,
            nivel_dificultad: 1,
            instrucciones: 'Completa',
            parametros: {
              frase: 'El gato duerme',
              imagen_id: '6b3f0f1e-6a4b-4c1e-9b2a-1d2e3f4a5b6c',
            },
          },
          'specialist-user',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('guarda los parámetros completos al crear', async () => {
      await useCase.create(
        {
          nombre: 'Reacción',
          categoria: CognitiveCategory.VELOCIDAD,
          nivel_dificultad: 1,
          instrucciones: 'Toca rápido',
          parametros: { intentos: 12 },
        },
        'specialist-user',
      );
      expect(repository.saveExercise).toHaveBeenCalledWith(
        expect.objectContaining({
          parametros: { intentos: 12, tiempo_limite_ms: 1500 },
        }),
        'specialist-user',
      );
    });
  });

  it('la ruta activa expone ejercicio_id y ruta_id en cada paso', async () => {
    const exercise = Object.assign(new ExerciseEntity(), { id: 'exercise-id' });
    repository.activeRoute.mockResolvedValue(
      Object.assign(new TherapeuticRouteEntity(), {
        id: 'route-id',
        ejercicios: [
          Object.assign(new RouteExerciseEntity(), {
            id: 'step-id',
            orden: 1,
            dia: 1,
            ejercicio: exercise,
          }),
        ],
      }),
    );
    repository.progress.mockResolvedValue({
      completados: 0,
      pendientes: 1,
      porcentaje: 0,
    });
    const route = await useCase.activeRoute('patient-id', {
      sub: 'admin',
      rol: UserRole.ADMINISTRADOR,
    });
    expect(route.ejercicios[0]).toMatchObject({
      id: 'step-id',
      ruta_id: 'route-id',
      ejercicio_id: 'exercise-id',
      ejercicio: { id: 'exercise-id' },
    });
  });

  it('no registra resultados de un día que aún no se habilita', async () => {
    const day1 = Object.assign(new RouteExerciseEntity(), {
      id: 'd1',
      dia: 1,
      estado: RouteExerciseStatus.COMPLETADO,
      fechaCompletado: new Date(),
    });
    const day2 = Object.assign(new RouteExerciseEntity(), {
      id: 'd2',
      dia: 2,
      ruta: route,
      estado: RouteExerciseStatus.PENDIENTE,
    });
    repository.routeExerciseInRoute.mockResolvedValue(day2);
    repository.activeRoute.mockResolvedValue(
      Object.assign(new TherapeuticRouteEntity(), {
        id: route.id,
        ejercicios: [day1, day2],
      }),
    );
    await expect(
      useCase.result(
        route.id,
        day2.id,
        { puntaje: 90, aciertos: 9, tiempo_reaccion_ms: 400 },
        'patient-user',
      ),
    ).rejects.toThrow(/se habilita el/);
    expect(repository.saveResult).not.toHaveBeenCalled();
  });
});
