import { PatientEntity } from '../entities/patient.entity';
import { UserEntity } from '../entities/user.entity';

export const PATIENT_REPOSITORY = Symbol('PATIENT_REPOSITORY');

export interface PatientRepositoryPort {
  specialistIdForUser(userId: string): Promise<string | null>;
  create(
    user: UserEntity,
    specialistId: string,
    data: {
      umbralBajoRendimiento: number;
      umbralDiasInactividad: number;
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
    data: PatientEntity[];
  }>;
  search(
    filters: {
      query?: string;
      estado?: string;
      nivel?: number;
    },
    specialistId?: string,
  ): Promise<PatientEntity[]>;
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
}
