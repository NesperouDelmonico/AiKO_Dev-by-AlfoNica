import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INCIDENT_REPOSITORY } from '../../domain/ports/incident.repository.port';
import type { IncidentRepositoryPort } from '../../domain/ports/incident.repository.port';
import { IncidentStatus } from '../../domain/entities/incident.entity';
import type { IncidentQueryDto } from '../dto/incident.dto';

@Injectable()
export class IncidentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly repository: IncidentRepositoryPort,
  ) {}

  create(userId: string, description: string) {
    return this.repository.create(userId, description);
  }

  list(query: IncidentQueryDto) {
    return this.repository.list(query.page, query.limit, query.estado);
  }

  async get(id: string) {
    const incident = await this.repository.find(id);
    if (!incident) throw new NotFoundException('Incidencia no encontrada');
    return incident;
  }

  async status(id: string, status: IncidentStatus) {
    await this.get(id);
    const incident = await this.repository.updateStatus(id, status);
    if (!incident) throw new NotFoundException('Incidencia no encontrada');
    return incident;
  }
}
