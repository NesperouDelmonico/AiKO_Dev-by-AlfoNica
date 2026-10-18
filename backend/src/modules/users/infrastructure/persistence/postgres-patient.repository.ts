import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientEntity } from '../../domain/entities/patient.entity';
import { SpecialistEntity } from '../../domain/entities/specialist.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import {
  AlertEntity,
  AlertStatus,
} from '../../../tracking/domain/entities/alert.entity';
import {
  TherapeuticRouteEntity,
  RouteStatus,
} from '../../../therapy/domain/entities/therapeutic-route.entity';
import { RouteExerciseStatus } from '../../../therapy/domain/entities/route-exercise.entity';
import type { PatientRepositoryPort } from '../../domain/ports/patient.repository.port';
import type { ListedPatient } from '../../domain/ports/patient.repository.port';

@Injectable()
export class PostgresPatientRepository implements PatientRepositoryPort {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(SpecialistEntity)
    private readonly specialists: Repository<SpecialistEntity>,
    @InjectRepository(AlertEntity)
    private readonly alerts: Repository<AlertEntity>,
    @InjectRepository(TherapeuticRouteEntity)
    private readonly routes: Repository<TherapeuticRouteEntity>,
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
      fechaNacimiento: string;
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
          fechaNacimiento: data.fechaNacimiento,
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
      .innerJoinAndSelect('patient.especialista', 'specialist')
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

    const patientIds = data.map((patient) => patient.id);
    if (patientIds.length === 0) return { total, page, limit, data: [] };

    const [alertRows, routeRows] = await Promise.all([
      this.alerts
        .createQueryBuilder('alert')
        .innerJoin('alert.paciente', 'patient')
        .select('patient.id', 'patientId')
        .addSelect('COUNT(alert.id)', 'count')
        .where('patient.id IN (:...patientIds)', { patientIds })
        .andWhere('alert.estado = :active', { active: AlertStatus.ACTIVA })
        .groupBy('patient.id')
        .getRawMany<{ patientId: string; count: string }>(),
      this.routes
        .createQueryBuilder('route')
        .innerJoin('route.paciente', 'patient')
        .leftJoin('route.ejercicios', 'item', 'item.estado <> :replaced', {
          replaced: RouteExerciseStatus.REEMPLAZADO,
        })
        .select('patient.id', 'patientId')
        .addSelect('route.id', 'routeId')
        .addSelect('COUNT(item.id)', 'total')
        .addSelect(
          'COUNT(item.id) FILTER (WHERE item.estado = :completed)',
          'completados',
        )
        .where('patient.id IN (:...patientIds)', { patientIds })
        .andWhere('route.estado = :active', { active: RouteStatus.ACTIVA })
        .setParameter('completed', RouteExerciseStatus.COMPLETADO)
        .groupBy('patient.id')
        .addGroupBy('route.id')
        .getRawMany<{
          patientId: string;
          routeId: string;
          total: string;
          completados: string;
        }>(),
    ]);
    const alertsByPatient = new Map(
      alertRows.map((row) => [row.patientId, Number(row.count)]),
    );
    const routesByPatient = new Map(
      routeRows.map((row) => {
        const total = Number(row.total);
        const completados = Number(row.completados);
        return [
          row.patientId,
          {
            rutaId: row.routeId,
            total,
            completados,
            porcentaje: total ? (completados * 100) / total : 0,
          },
        ];
      }),
    );
    const listedData: ListedPatient[] = data.map((patient) =>
      Object.assign(patient, {
        alertasActivas: alertsByPatient.get(patient.id) ?? 0,
        progresoRuta: routesByPatient.get(patient.id) ?? null,
      }),
    );
    return { total, page, limit, data: listedData };
  }

  async search(
    filters: { query?: string; estado?: string; nivel?: number },
    specialistId?: string,
  ) {
    const builder = this.patients
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.usuario', 'user')
      .leftJoinAndSelect('patient.especialista', 'specialist');

    if (specialistId) {
      builder.andWhere('specialist.id = :specialistId', { specialistId });
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

  async updateBirthDate(patientId: string, fechaNacimiento: string) {
    await this.patients.update(patientId, { fechaNacimiento });
    return this.findById(patientId);
  }
}
