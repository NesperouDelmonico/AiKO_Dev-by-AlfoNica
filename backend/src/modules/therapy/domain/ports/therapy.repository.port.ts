import { ExerciseEntity } from '../entities/exercise.entity';
import { TherapeuticRouteEntity } from '../entities/therapeutic-route.entity';
import { RouteExerciseEntity } from '../entities/route-exercise.entity';
import { ExerciseResultEntity } from '../entities/exercise-result.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
export const THERAPY_REPOSITORY = Symbol('THERAPY_REPOSITORY');
export interface TherapyRepositoryPort {
  exercises(filters: Partial<ExerciseEntity>): Promise<ExerciseEntity[]>;
  exercise(id: string): Promise<ExerciseEntity | null>;
  specialistIdForUser(userId: string): Promise<string | null>;
  patientForUser(userId: string): Promise<PatientEntity | null>;
  patientById(patientId: string): Promise<PatientEntity | null>;
  patientAssignedToSpecialist(
    patientId: string,
    specialistUserId: string,
  ): Promise<boolean>;
  routeExists(routeId: string): Promise<boolean>;
  routePatientId(routeId: string): Promise<string | null>;
  routeIsActive(routeId: string): Promise<boolean>;
  routeExerciseCount(routeId: string): Promise<number>;
  exerciseAvailableForPatient(
    patientId: string,
    exerciseId: string,
  ): Promise<boolean>;
  saveExercise(
    data: Partial<ExerciseEntity>,
    specialistUserId: string,
  ): Promise<ExerciseEntity>;
  exerciseOwnedBySpecialist(
    exerciseId: string,
    specialistUserId: string,
  ): Promise<boolean>;
  updateExercise(
    id: string,
    data: Partial<ExerciseEntity>,
  ): Promise<ExerciseEntity | null>;
  activeUsage(id: string): Promise<boolean>;
  createRoute(
    patientId: string,
    items: { ejercicioId: string; orden: number }[],
  ): Promise<TherapeuticRouteEntity>;
  activeRoute(patientId: string): Promise<TherapeuticRouteEntity | null>;
  progress(
    routeId: string,
  ): Promise<{ porcentaje: number; completados: number; pendientes: number }>;
  addRouteExercise(
    routeId: string,
    exerciseId: string,
    orden: number,
  ): Promise<RouteExerciseEntity>;
  routeExercise(id: string): Promise<RouteExerciseEntity | null>;
  routeExerciseInRoute(
    routeId: string,
    routeExerciseId: string,
  ): Promise<RouteExerciseEntity | null>;
  removeRouteExercise(id: string): Promise<void>;
  resequenceRoute(routeId: string): Promise<void>;
  replaceRouteExercise(
    id: string,
    exerciseId: string,
  ): Promise<RouteExerciseEntity | null>;
  saveResult(
    routeExerciseId: string,
    patientId: string,
    data: {
      puntaje: number;
      tiempoReaccionMs: number | null;
      aciertos: number;
      xpGanado: number;
      xpPorNivel: number;
    },
    shouldAdvance?: boolean,
  ): Promise<ExerciseResultEntity>;
  results(patientId: string): Promise<ExerciseResultEntity[]>;
  resultsPage(
    patientId: string,
    page: number,
    limit: number,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: ExerciseResultEntity[];
  }>;
  domainProgress(
    patientId: string,
    desde?: string,
    hasta?: string,
  ): Promise<{ categoria: string; porcentaje: number }[]>;
  temporalProgress(
    patientId: string,
    desde?: string,
    hasta?: string,
  ): Promise<{
    serie: { fecha: string; valor: number }[];
    aviso: string | null;
  }>;
}
