import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdministratorEntity } from '../../domain/entities/administrator.entity';
import { PatientEntity } from '../../domain/entities/patient.entity';
import { SpecialistEntity } from '../../domain/entities/specialist.entity';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import { IncidentEntity } from '../../domain/entities/incident.entity';
import type { UsersRepositoryPort } from '../../domain/ports/users.repository.port';
@Injectable()
export class PostgresUsersRepository implements UsersRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(AdministratorEntity)
    private readonly admins: Repository<AdministratorEntity>,
    @InjectRepository(SpecialistEntity)
    private readonly specialists: Repository<SpecialistEntity>,
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
  ) {}
  async list(page: number, limit: number, rol?: UserRole, estado?: boolean) {
    const [data, total] = await this.users.findAndCount({
      where: {
        ...(rol ? { rol } : {}),
        ...(estado === undefined ? {} : { estado }),
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { fechaCreacion: 'DESC' },
    });
    return { total, page, limit, data };
  }
  find(id: string) {
    return this.users.findOneBy({ id });
  }
  async update(id: string, data: Partial<UserEntity>) {
    await this.users.update(id, data as any);
    return this.find(id);
  }
  async setState(id: string, estado: boolean) {
    await this.users.update(id, { estado });
    return this.find(id);
  }
  async createAdministrator(data: Partial<UserEntity>) {
    const user = await this.users.save(
      this.users.create({ ...data, rol: UserRole.ADMINISTRADOR }),
    );
    return this.admins.save(this.admins.create({ usuario: user }));
  }
  async createSpecialist(data: Partial<UserEntity>) {
    const user = await this.users.save(
      this.users.create({ ...data, rol: UserRole.ESPECIALISTA }),
    );
    return this.specialists.save(this.specialists.create({ usuario: user }));
  }
  incidents() {
    return this.incidentRepo.find();
  }
  createPatient(data: Partial<PatientEntity>) {
    return this.patients.save(this.patients.create(data));
  }
}
