import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministratorEntity } from './domain/entities/administrator.entity';
import { IncidentEntity } from './domain/entities/incident.entity';
import { PatientEntity } from './domain/entities/patient.entity';
import { SpecialistEntity } from './domain/entities/specialist.entity';
import { UserEntity } from './domain/entities/user.entity';
import { UsersController } from './interfaces/http/users.controller';
import { UsersUseCase } from './application/use-cases/users.use-case';
import { PostgresUsersRepository } from './infrastructure/persistence/postgres-users.repository';
import { USERS_REPOSITORY } from './domain/ports/users.repository.port';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdministratorEntity,
      IncidentEntity,
      PatientEntity,
      SpecialistEntity,
      UserEntity,
    ]),
  ],
  controllers: [UsersController],
  providers: [
    UsersUseCase,
    PostgresUsersRepository,
    { provide: USERS_REPOSITORY, useExisting: PostgresUsersRepository },
  ],
})
export class UsersModule {}
