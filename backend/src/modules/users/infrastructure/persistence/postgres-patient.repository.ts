import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientEntity } from '../../domain/entities/patient.entity';
import { SpecialistEntity } from '../../domain/entities/specialist.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import type { PatientRepositoryPort } from '../../domain/ports/patient.repository.port';

@Injectable()
export class PostgresPatientRepository implements PatientRepositoryPort {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(SpecialistEntity)
    private readonly specialists: Repository<SpecialistEntity>,
  ) {}

  async specialistIdForUser(userId: string) {
    const specialist = await this.specialists.findOne({
      where: { usuario: { id: userId } },
      select: { id: true },
    });
    return specialist?.id ?? null;
  }

  async create(
    user: UserEntity,
    specialistId: string,
    data: {
      umbralBajoRendimiento: number;
      umbralDiasInactividad: number;
    },
  ) {
    return this.patients.manager.transaction(async (manager) => {
      const savedUser = await manager.save(UserEntity, user);
      const specialist = await manager.findOneByOrFail(SpecialistEntity, {
        id: specialistId,
      });
      return manager.save(
        PatientEntity,
        manager.create(PatientEntity, {
          usuario: savedUser,
          especialista: specialist,
          umbralBajoRendimiento: data.umbralBajoRendimiento,
          umbralDiasInactividad: data.umbralDiasInactividad,
          fechaAsignacion: new Date(),
        }),
      );
    });
  }

  async listAssigned(
    specialistId: string,
    page: number,
    limit: number,
    query?: string,
  ) {
    const builder = this.patients
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.usuario', 'user')
      .innerJoin('patient.especialista', 'specialist')
      .where('specialist.id = :specialistId', { specialistId });

    if (query) {
      builder.andWhere(
        '(user.nombre ILIKE :query OR user.correo ILIKE :query OR user.cedula ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    const [data, total] = await builder
      .orderBy('user.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { total, page, limit, data };
  }

  async search(
    filters: { query?: string; estado?: string; nivel?: number },
    specialistId?: string,
  ) {
    const builder = this.patients
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.usuario', 'user');

    if (specialistId) {
      builder
        .innerJoin('patient.especialista', 'specialist')
        .andWhere('specialist.id = :specialistId', { specialistId });
    }

    if (filters.query) {
      builder.andWhere(
        '(user.nombre ILIKE :query OR user.correo ILIKE :query OR user.cedula ILIKE :query)',
        { query: `%${filters.query}%` },
      );
    }
    if (filters.estado !== undefined) {
      builder.andWhere('user.estado::text = :estado', {
        estado: filters.estado,
      });
    }
    if (filters.nivel !== undefined) {
      builder.andWhere('patient.nivel_actual = :nivel', {
        nivel: filters.nivel,
      });
    }

    return builder.orderBy('user.nombre', 'ASC').getMany();
  }

  findById(id: string) {
    return this.patients.findOne({
      where: { id },
      relations: { usuario: true, especialista: { usuario: true } },
    });
  }

  async assign(patientId: string, specialistId: string) {
    const [patient, specialist] = await Promise.all([
      this.patients.findOneBy({ id: patientId }),
      this.specialists.findOne({
        where: { id: specialistId },
        relations: { usuario: true },
      }),
    ]);
    if (!patient || !specialist) return null;
    if (!specialist.usuario.estado) {
      throw new Error('SPECIALIST_INACTIVE');
    }

    patient.especialista = specialist;
    patient.fechaAsignacion = new Date();
    await this.patients.save(patient);
    return this.findById(patientId);
  }

  async updateThresholds(
    patientId: string,
    data: {
      umbralBajoRendimiento: number;
      umbralDiasInactividad: number;
    },
  ) {
    await this.patients.update(patientId, data);
    return this.findById(patientId);
  }
}
