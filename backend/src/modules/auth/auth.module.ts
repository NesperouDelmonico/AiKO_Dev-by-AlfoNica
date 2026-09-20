import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/domain/entities/user.entity';
import { AuthController } from './interfaces/http/auth.controller';
import { AuthUseCase } from './application/use-cases/auth.use-case';
import { PostgresAuthRepository } from './infrastructure/persistence/postgres-auth.repository';
import { AUTH_REPOSITORY } from './domain/ports/auth.repository.port';
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [AuthController],
  providers: [
    AuthUseCase,
    PostgresAuthRepository,
    { provide: AUTH_REPOSITORY, useExisting: PostgresAuthRepository },
  ],
})
export class AuthModule {}
