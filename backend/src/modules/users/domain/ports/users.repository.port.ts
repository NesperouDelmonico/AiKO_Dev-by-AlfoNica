import { AdministratorEntity } from '../entities/administrator.entity';
import { IncidentEntity } from '../entities/incident.entity';
import { PatientEntity } from '../entities/patient.entity';
import { SpecialistEntity } from '../entities/specialist.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
export type UserWithSpecialistId = UserEntity & {
  especialistaId?: string | null;
};

export interface UsersRepositoryPort {
  list(
    page: number,
    limit: number,
    rol?: UserRole,
    estado?: boolean,
    query?: string,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: UserWithSpecialistId[];
  }>;
  find(id: string): Promise<UserWithSpecialistId | null>;
  findByEmail(correo: string): Promise<UserEntity | null>;
  findByCedula(cedula: string): Promise<UserEntity | null>;
  hasAdministrator(): Promise<boolean>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null>;
  setState(id: string, estado: boolean): Promise<UserEntity | null>;
  setStateSafely(
    id: string,
    estado: boolean,
    actorId: string,
  ): Promise<UserEntity | null>;
  setPassword(id: string, passwordHash: string): Promise<UserEntity | null>;
  resetPasswordAndNotify(
    id: string,
    passwordHash: string,
    notify: () => Promise<void>,
  ): Promise<UserEntity | null>;
  createInitialAdministrator(
    data: Partial<UserEntity>,
  ): Promise<UserEntity | null>;
  createAdministrator(data: Partial<UserEntity>): Promise<UserEntity>;
  createSpecialist(data: Partial<UserEntity>): Promise<UserWithSpecialistId>;
  indicators(): Promise<{
    total_usuarios: number;
    total_pacientes: number;
    sesiones_activas: number;
  }>;
  trends(
    period: 'week' | 'month',
  ): Promise<{ fecha: string; sesiones: number }[]>;
  incidents(): Promise<IncidentEntity[]>;
  createPatient(data: Partial<PatientEntity>): Promise<PatientEntity>;
}
