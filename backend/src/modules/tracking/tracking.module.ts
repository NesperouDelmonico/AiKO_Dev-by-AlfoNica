import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './domain/entities/observation.entity';
import { AlertEntity } from './domain/entities/alert.entity';
import { NotificationEntity } from './domain/entities/notification.entity';
import { NotificationPreferenceEntity } from './domain/entities/notification-preference.entity';
import { PatientEntity } from '../users/domain/entities/patient.entity';
import { SpecialistEntity } from '../users/domain/entities/specialist.entity';
import { TrackingController } from './interfaces/http/tracking.controller';
import { TrackingUseCase } from './application/use-cases/tracking.use-case';
import { PostgresTrackingRepository } from './infrastructure/persistence/postgres-tracking.repository';
import { TRACKING_REPOSITORY } from './domain/ports/tracking.repository.port';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ObservationEntity,
      AlertEntity,
      NotificationEntity,
      NotificationPreferenceEntity,
      PatientEntity,
      SpecialistEntity,
    ]),
  ],
  controllers: [TrackingController],
  providers: [
    TrackingUseCase,
    PostgresTrackingRepository,
    { provide: TRACKING_REPOSITORY, useExisting: PostgresTrackingRepository },
  ],
})
export class TrackingModule {}
