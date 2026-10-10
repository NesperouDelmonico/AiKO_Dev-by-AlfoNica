import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AdministratorEntity } from '../../domain/entities/administrator.entity';
import { PatientEntity } from '../../domain/entities/patient.entity';
import { SpecialistEntity } from '../../domain/entities/specialist.entity';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import { IncidentEntity } from '../../domain/entities/incident.entity';
import { ExerciseResultEntity } from '../../../therapy/domain/entities/exercise-result.entity';
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
    @InjectRepository(ExerciseResultEntity)
    private readonly results: Repository<ExerciseResultEntity>,
  ) {}
  async list(
    page: number,
    limit: number,
    rol?: UserRole,
    estado?: boolean,
    query?: string,
  ) {
    const builder = this.users.createQueryBuilder('user');
    if (rol) builder.andWhere('user.rol = :rol', { rol });
    if (estado !== undefined)
      builder.andWhere('user.estado = :estado', { estado });
    if (query) {
      builder.andWhere(
        '(user.nombre ILIKE :query OR user.correo ILIKE :query OR user.cedula ILIKE :query)',
        { query: `%${query}%` },
      );
    }
    const [data, total] = await builder
      .orderBy('user.fechaCreacion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { total, page, limit, data };
  }
  find(id: string) {
    return this.users.findOneBy({ id });
  }
  findByEmail(correo: string) {
    return this.users.findOneBy({ correo });
  }
  findByCedula(cedula: string) {
    return this.users.findOneBy({ cedula });
  }
  async hasAdministrator() {
    return (await this.admins.count()) > 0;
  }
  async update(id: string, data: Partial<UserEntity>) {
    const update = data as QueryDeepPartialEntity<UserEntity>;
    await this.users.update(id, update);
    return this.find(id);
  }
  async setState(id: string, estado: boolean) {
    await this.users.update(id, { estado });
    return this.find(id);
  }
  async createInitialAdministrator(data: Partial<UserEntity>) {
    return this.users.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [741852963]);
      if ((await manager.count(AdministratorEntity)) > 0) return null;
      const user = await manager.save(
        UserEntity,
        manager.create(UserEntity, { ...data, rol: UserRole.ADMINISTRADOR }),
      );
      await manager.save(
        AdministratorEntity,
        manager.create(AdministratorEntity, { usuario: user }),
      );
      return user;
    });
  }
  async createAdministrator(data: Partial<UserEntity>) {
    return this.users.manager.transaction(async (manager) => {
      const user = await manager.save(
        UserEntity,
        manager.create(UserEntity, { ...data, rol: UserRole.ADMINISTRADOR }),
      );
      await manager.save(
        AdministratorEntity,
        manager.create(AdministratorEntity, { usuario: user }),
      );
      return user;
    });
  }
  async createSpecialist(data: Partial<UserEntity>) {
    return this.users.manager.transaction(async (manager) => {
      const user = await manager.save(
        UserEntity,
        manager.create(UserEntity, { ...data, rol: UserRole.ESPECIALISTA }),
      );
      await manager.save(
        SpecialistEntity,
        manager.create(SpecialistEntity, { usuario: user }),
      );
      return user;
    });
  }
  incidents() {
    return this.incidentRepo.find();
  }
  async indicators() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalUsers, totalPatients, activeSessions] = await Promise.all([
      this.users.count(),
      this.patients.count(),
      this.results.count({ where: { fecha: MoreThan(since) } }),
    ]);
    return {
      total_usuarios: totalUsers,
      total_pacientes: totalPatients,
      sesiones_activas: activeSessions,
    };
  }
  async trends(period: 'week' | 'month') {
    const rangeStart = new Date();
    rangeStart.setUTCMonth(
      rangeStart.getUTCMonth() - (period === 'week' ? 3 : 12),
    );
    const rows = await this.results
      .createQueryBuilder('result')
      .select(
        "to_char(date_trunc(:period, result.fecha), 'YYYY-MM-DD')",
        'fecha',
      )
      .addSelect('COUNT(*)', 'sesiones')
      .where('result.fecha >= :rangeStart', { rangeStart })
      .setParameter('period', period)
      .groupBy('fecha')
      .orderBy('fecha', 'ASC')
      .getRawMany<{ fecha: string; sesiones: string }>();
    return rows.map((row) => ({
      fecha: row.fecha,
      sesiones: Number(row.sesiones),
    }));
  }
  createPatient(data: Partial<PatientEntity>) {
    return this.patients.save(this.patients.create(data));
  }
}
