import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentEntity } from './domain/entities/incident.entity';
import { UserEntity } from './domain/entities/user.entity';
import { IncidentController } from './interfaces/http/incident.controller';
import { IncidentUseCase } from './application/use-cases/incident.use-case';
import { PostgresIncidentRepository } from './infrastructure/persistence/postgres-incident.repository';
import { INCIDENT_REPOSITORY } from './domain/ports/incident.repository.port';
@Module({
  imports: [TypeOrmModule.forFeature([IncidentEntity, UserEntity])],
  controllers: [IncidentController],
  providers: [
    IncidentUseCase,
    PostgresIncidentRepository,
    { provide: INCIDENT_REPOSITORY, useExisting: PostgresIncidentRepository },
  ],
})
export class IncidentsModule {}
