import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExerciseEntity } from './domain/entities/exercise.entity';
import { TherapeuticRouteEntity } from './domain/entities/therapeutic-route.entity';
import { RouteExerciseEntity } from './domain/entities/route-exercise.entity';
import { ExerciseResultEntity } from './domain/entities/exercise-result.entity';
import { PatientEntity } from '../users/domain/entities/patient.entity';
import { SpecialistEntity } from '../users/domain/entities/specialist.entity';
import { TherapyController } from './interfaces/http/therapy.controller';
import { TherapyUseCase } from './application/use-cases/therapy.use-case';
import { PostgresTherapyRepository } from './infrastructure/persistence/postgres-therapy.repository';
import { THERAPY_REPOSITORY } from './domain/ports/therapy.repository.port';
import { GamificationModule } from '../gamification/gamification.module';
import { ImageEntity } from './domain/entities/image.entity';
import { ImagesController } from './interfaces/http/images.controller';
import { ImagesUseCase } from './application/use-cases/images.use-case';
import { PostgresImageStorage } from './infrastructure/persistence/postgres-image.storage';
import { IMAGE_STORAGE } from './domain/ports/image-storage.port';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExerciseEntity,
      TherapeuticRouteEntity,
      RouteExerciseEntity,
      ExerciseResultEntity,
      PatientEntity,
      SpecialistEntity,
      ImageEntity,
    ]),
    GamificationModule,
  ],
  controllers: [TherapyController, ImagesController],
  providers: [
    TherapyUseCase,
    PostgresTherapyRepository,
    { provide: THERAPY_REPOSITORY, useExisting: PostgresTherapyRepository },
    ImagesUseCase,
    PostgresImageStorage,
    { provide: IMAGE_STORAGE, useExisting: PostgresImageStorage },
  ],
})
export class TherapyModule {}
