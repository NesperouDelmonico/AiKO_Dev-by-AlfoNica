import { PatientEntity } from '../entities/patient.entity';
import { UserEntity } from '../entities/user.entity';

export const PATIENT_REPOSITORY = Symbol('PATIENT_REPOSITORY');

export type PatientRouteProgress = {
  rutaId: string;
  total: number;
  completados: number;
  porcentaje: number;
};

export type ListedPatient = PatientEntity & {
  alertasActivas: number;
  progresoRuta: PatientRouteProgress | null;
};

export interface PatientRepositoryPort {
  specialistIdForUser(userId: string): Promise<string | null>;
  create(
    user: UserEntity,
    specialistId: string,
    data: {
      umbralBajoRendimiento: number;
      umbralDiasInactividad: number;
      fechaNacimiento: string;
    },
  ): Promise<PatientEntity>;
  listAssigned(
    specialistId: string,
    page: number,
    limit: number,
    query?: string,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: ListedPatient[];
  }>;
  search(
    filters: {
      query?: string;
      estado?: string;
      nivel?: number;
      page: number;
      limit: number;
    },
    specialistId?: string,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: ListedPatient[];
  }>;
  findById(id: string): Promise<PatientEntity | null>;
  assign(
    patientId: string,
    specialistId: string,
  ): Promise<PatientEntity | null>;
  updateThresholds(
    patientId: string,
    data: {
      umbralBajoRendimiento: number;
      umbralDiasInactividad: number;
    },
  ): Promise<PatientEntity | null>;
  updateBirthDate(
    patientId: string,
    fechaNacimiento: string,
  ): Promise<PatientEntity | null>;
}
