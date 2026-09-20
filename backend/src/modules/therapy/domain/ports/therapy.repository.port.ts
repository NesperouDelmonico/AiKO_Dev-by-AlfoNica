import { ExerciseEntity } from '../entities/exercise.entity';
import { TherapeuticRouteEntity } from '../entities/therapeutic-route.entity';
import { RouteExerciseEntity } from '../entities/route-exercise.entity';
import { ExerciseResultEntity } from '../entities/exercise-result.entity';
export const THERAPY_REPOSITORY = Symbol('THERAPY_REPOSITORY');
export interface TherapyRepositoryPort {
  exercises(filters: Partial<ExerciseEntity>): Promise<ExerciseEntity[]>;
  exercise(id: string): Promise<ExerciseEntity | null>;
  saveExercise(data: Partial<ExerciseEntity>): Promise<ExerciseEntity>;
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
    },
  ): Promise<ExerciseResultEntity>;
  results(patientId: string): Promise<ExerciseResultEntity[]>;
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
