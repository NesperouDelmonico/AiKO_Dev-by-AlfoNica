import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { BadgeEntity } from '../../domain/entities/badge.entity';
import { PatientBadgeEntity } from '../../domain/entities/patient-badge.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { ExerciseEntity } from '../../../therapy/domain/entities/exercise.entity';
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
  ) {}
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
    return {
      nivel_actual: p.nivelActual,
      xp_total: p.xpTotal,
      insignias: await this.patientBadges(id),
    };
  }
  async unlocked(id: string) {
    const p = await this.patients.findOneByOrFail({ id });
    return this.exercises.find({
      where: { nivelDificultad: LessThanOrEqual(p.nivelActual) },
    });
  }
}
