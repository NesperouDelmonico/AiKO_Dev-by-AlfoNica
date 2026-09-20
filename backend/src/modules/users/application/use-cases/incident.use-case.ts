import { Inject, Injectable } from '@nestjs/common';
import { INCIDENT_REPOSITORY } from '../../domain/ports/incident.repository.port';
import type { IncidentRepositoryPort } from '../../domain/ports/incident.repository.port';

@Injectable()
export class IncidentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly repository: IncidentRepositoryPort,
  ) {}
  create(_data: unknown): never {
    throw new Error('TODO: pendiente de lógica de negocio - crear incidencia');
  }
  list(_status?: unknown): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - listar incidencias',
    );
  }
  get(_id: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - obtener incidencia',
    );
  }
  status(_id: string, _status: unknown): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - actualizar estado de incidencia',
    );
  }
}
