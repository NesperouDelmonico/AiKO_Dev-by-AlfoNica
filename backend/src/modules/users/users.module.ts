import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministratorEntity } from './domain/entities/administrator.entity';
import { IncidentEntity } from './domain/entities/incident.entity';
import { PatientEntity } from './domain/entities/patient.entity';
import { SpecialistEntity } from './domain/entities/specialist.entity';
import { UserEntity } from './domain/entities/user.entity';
import { ExerciseResultEntity } from '../therapy/domain/entities/exercise-result.entity';
import { UsersController } from './interfaces/http/users.controller';
import { UsersUseCase } from './application/use-cases/users.use-case';
import { PostgresUsersRepository } from './infrastructure/persistence/postgres-users.repository';
import { USERS_REPOSITORY } from './domain/ports/users.repository.port';
import { PatientController } from './interfaces/http/patient.controller';
import { PatientUseCase } from './application/use-cases/patient.use-case';
import { PostgresPatientRepository } from './infrastructure/persistence/postgres-patient.repository';
import { PATIENT_REPOSITORY } from './domain/ports/patient.repository.port';
import { AdminMetricsController } from './interfaces/http/admin-metrics.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdministratorEntity,
      IncidentEntity,
      PatientEntity,
      SpecialistEntity,
      UserEntity,
      ExerciseResultEntity,
    ]),
  ],
  controllers: [UsersController, PatientController, AdminMetricsController],
  providers: [
    UsersUseCase,
    PostgresUsersRepository,
    { provide: USERS_REPOSITORY, useExisting: PostgresUsersRepository },
    PatientUseCase,
    PostgresPatientRepository,
    { provide: PATIENT_REPOSITORY, useExisting: PostgresPatientRepository },
  ],
})
export class UsersModule {}
