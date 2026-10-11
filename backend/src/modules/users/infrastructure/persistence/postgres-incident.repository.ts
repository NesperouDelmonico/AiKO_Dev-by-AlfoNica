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
  async list(page: number, limit: number, estado?: IncidentStatus) {
    const [data, total] = await this.incidents.findAndCount({
      where: estado ? { estado } : {},
      order: { fecha: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { total, page, limit, data };
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
