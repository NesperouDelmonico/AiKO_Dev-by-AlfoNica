import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadgeEntity } from './domain/entities/badge.entity';
import { PatientBadgeEntity } from './domain/entities/patient-badge.entity';
import { PatientEntity } from '../users/domain/entities/patient.entity';
import { ExerciseEntity } from '../therapy/domain/entities/exercise.entity';
import { ExerciseResultEntity } from '../therapy/domain/entities/exercise-result.entity';
import { NotificationEntity } from '../tracking/domain/entities/notification.entity';
import { TrackingModule } from '../tracking/tracking.module';
import { GamificationController } from './interfaces/http/gamification.controller';
import { GamificationUseCase } from './application/use-cases/gamification.use-case';
import { PostgresGamificationRepository } from './infrastructure/persistence/postgres-gamification.repository';
import { GAMIFICATION_REPOSITORY } from './domain/ports/gamification.repository.port';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BadgeEntity,
      PatientBadgeEntity,
      PatientEntity,
      ExerciseEntity,
      ExerciseResultEntity,
      NotificationEntity,
    ]),
    TrackingModule,
  ],
  controllers: [GamificationController],
  providers: [
    GamificationUseCase,
    PostgresGamificationRepository,
    {
      provide: GAMIFICATION_REPOSITORY,
      useExisting: PostgresGamificationRepository,
    },
  ],
  exports: [GamificationUseCase],
})
export class GamificationModule {}
