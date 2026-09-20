import { AdministratorEntity } from '../entities/administrator.entity';
import { IncidentEntity } from '../entities/incident.entity';
import { PatientEntity } from '../entities/patient.entity';
import { SpecialistEntity } from '../entities/specialist.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
export interface UsersRepositoryPort {
  list(
    page: number,
    limit: number,
    rol?: UserRole,
    estado?: boolean,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: UserEntity[];
  }>;
  find(id: string): Promise<UserEntity | null>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null>;
  setState(id: string, estado: boolean): Promise<UserEntity | null>;
  createAdministrator(data: Partial<UserEntity>): Promise<AdministratorEntity>;
  createSpecialist(data: Partial<UserEntity>): Promise<SpecialistEntity>;
  incidents(): Promise<IncidentEntity[]>;
  createPatient(data: Partial<PatientEntity>): Promise<PatientEntity>;
}
