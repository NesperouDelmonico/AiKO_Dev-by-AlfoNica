import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { BadgeEntity } from '../../domain/entities/badge.entity';
import { PatientBadgeEntity } from '../../domain/entities/patient-badge.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import {
  ExerciseEntity,
  ExerciseStatus,
} from '../../../therapy/domain/entities/exercise.entity';
import { ExerciseResultEntity } from '../../../therapy/domain/entities/exercise-result.entity';
import {
  NotificationEntity,
  NotificationType,
} from '../../../tracking/domain/entities/notification.entity';
import { GamificationRepositoryPort } from '../../domain/ports/gamification.repository.port';
@Injectable()
export class PostgresGamificationRepository implements GamificationRepositoryPort {
  constructor(
    @InjectRepository(BadgeEntity)
    private readonly badgesRepo: Repository<BadgeEntity>,
    @InjectRepository(PatientBadgeEntity)
    private readonly patientRepo: Repository<PatientBadgeEntity>,
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(ExerciseEntity)
    private readonly exercises: Repository<ExerciseEntity>,
    @InjectRepository(ExerciseResultEntity)
    private readonly resultsRepo: Repository<ExerciseResultEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
  ) {}
  patientExists(id: string) {
    return this.patients.existsBy({ id });
  }
  patientOwnedByUser(patientId: string, userId: string) {
    return this.patients.exists({
      where: {
        id: patientId,
        usuario: { id: userId },
      },
    });
  }
  patientAssignedToSpecialist(patientId: string, specialistUserId: string) {
    return this.patients.exists({
      where: {
        id: patientId,
        especialista: { usuario: { id: specialistUserId } },
      },
    });
  }
  badges() {
    return this.badgesRepo.find();
  }
  patientBadges(id: string) {
    return this.patientRepo.find({
      where: { pacienteId: id },
      relations: { insignia: true },
    });
  }
  async profile(id: string) {
    const p = await this.patients.findOneByOrFail({ id });
    const badges = await this.patientBadges(id);
    return {
      nivel_actual: p.nivelActual,
      xp_total: p.xpTotal,
      insignias: badges.map((badge) => badge.insignia),
    };
  }
  async unlocked(id: string) {
    const p = await this.patients.findOneByOrFail({ id });
    return this.exercises.find({
      where: {
        nivelDificultad: LessThanOrEqual(p.nivelActual),
        estado: ExerciseStatus.ACTIVO,
      },
    });
  }
  async metrics(id: string) {
    const patient = await this.patients.findOneByOrFail({ id });
    const results = await this.resultsRepo.find({
      where: { paciente: { id } },
    });
    return {
      xp: patient.xpTotal,
      nivel: patient.nivelActual,
      sesiones: results.length,
      mejor_puntaje: results.reduce(
        (best, result) => Math.max(best, result.puntaje),
        0,
      ),
      puntaje_promedio: results.length
        ? results.reduce((total, result) => total + result.puntaje, 0) /
          results.length
        : 0,
      aciertos: results.reduce((total, result) => total + result.aciertos, 0),
    };
  }
  async awardBadge(patientId: string, badgeId: string) {
    const [patient, badge] = await Promise.all([
      this.patients.findOneByOrFail({ id: patientId }),
      this.badgesRepo.findOneByOrFail({ id: badgeId }),
    ]);
    const insert = await this.patientRepo
      .createQueryBuilder()
      .insert()
      .values({
        pacienteId: patient.id,
        insigniaId: badge.id,
      })
      .orIgnore()
      .execute();
    if (insert.identifiers.length === 0) return null;
    return this.patientRepo.findOneOrFail({
      where: { pacienteId: patient.id, insigniaId: badge.id },
      relations: { paciente: true, insignia: true },
    });
  }
  async createNotification(
    patientId: string,
    type: NotificationType,
    message: string,
  ) {
    const patient = await this.patients.findOneByOrFail({ id: patientId });
    return this.notifications.save(
      this.notifications.create({
        paciente: patient,
        tipo: type,
        mensaje: message,
      }),
    );
  }
}
