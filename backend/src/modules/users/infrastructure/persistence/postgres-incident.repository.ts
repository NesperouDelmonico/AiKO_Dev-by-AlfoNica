import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IncidentEntity,
  IncidentStatus,
} from '../../domain/entities/incident.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { IncidentRepositoryPort } from '../../domain/ports/incident.repository.port';
@Injectable()
export class PostgresIncidentRepository implements IncidentRepositoryPort {
  constructor(
    @InjectRepository(IncidentEntity)
    private readonly incidents: Repository<IncidentEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}
  async create(userId: string, descripcion: string) {
    const usuario = await this.users.findOneByOrFail({ id: userId });
    return this.incidents.save(
      this.incidents.create({
        usuario,
        descripcion,
        estado: IncidentStatus.PENDIENTE,
      }),
    );
  }
  list(estado?: IncidentStatus) {
    return this.incidents.find({
      where: estado ? { estado } : {},
      order: { fecha: 'DESC' },
    });
  }
  find(id: string) {
    return this.incidents.findOne({
      where: { id },
      relations: { usuario: true },
    });
  }
  async updateStatus(id: string, estado: IncidentStatus) {
    await this.incidents.update(id, { estado });
    return this.find(id);
  }
}
