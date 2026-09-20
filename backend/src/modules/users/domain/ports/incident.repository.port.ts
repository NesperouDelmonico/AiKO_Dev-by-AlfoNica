import { IncidentEntity, IncidentStatus } from '../entities/incident.entity';
export const INCIDENT_REPOSITORY = Symbol('INCIDENT_REPOSITORY');
export interface IncidentRepositoryPort {
  create(userId: string, descripcion: string): Promise<IncidentEntity>;
  list(estado?: IncidentStatus): Promise<IncidentEntity[]>;
  find(id: string): Promise<IncidentEntity | null>;
  updateStatus(
    id: string,
    estado: IncidentStatus,
  ): Promise<IncidentEntity | null>;
}
