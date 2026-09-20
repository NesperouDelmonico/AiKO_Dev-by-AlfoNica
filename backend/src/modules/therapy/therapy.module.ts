import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExerciseEntity } from './domain/entities/exercise.entity';
import { TherapeuticRouteEntity } from './domain/entities/therapeutic-route.entity';
import { RouteExerciseEntity } from './domain/entities/route-exercise.entity';
import { ExerciseResultEntity } from './domain/entities/exercise-result.entity';
import { PatientEntity } from '../users/domain/entities/patient.entity';
import { TherapyController } from './interfaces/http/therapy.controller';
import { TherapyUseCase } from './application/use-cases/therapy.use-case';
import { PostgresTherapyRepository } from './infrastructure/persistence/postgres-therapy.repository';
import { THERAPY_REPOSITORY } from './domain/ports/therapy.repository.port';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExerciseEntity,
      TherapeuticRouteEntity,
      RouteExerciseEntity,
      ExerciseResultEntity,
      PatientEntity,
    ]),
  ],
  controllers: [TherapyController],
  providers: [
    TherapyUseCase,
    PostgresTherapyRepository,
    { provide: THERAPY_REPOSITORY, useExisting: PostgresTherapyRepository },
  ],
})
export class TherapyModule {}
