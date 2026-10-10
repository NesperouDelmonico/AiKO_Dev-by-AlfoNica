import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { TherapyUseCase } from './therapy.use-case';
import type { TherapyRepositoryPort } from '../../domain/ports/therapy.repository.port';
import { ExerciseEntity, ExerciseStatus } from '../../domain/entities/exercise.entity';
import {
  RouteExerciseEntity,
  RouteExerciseStatus,
} from '../../domain/entities/route-exercise.entity';
import { RouteStatus, TherapeuticRouteEntity } from '../../domain/entities/therapeutic-route.entity';
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
});
