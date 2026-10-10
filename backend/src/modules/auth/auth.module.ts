import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/domain/entities/user.entity';
import { RevokedTokenEntity } from './domain/entities/revoked-token.entity';
import { AuthController } from './interfaces/http/auth.controller';
import { JwtAuthGuard } from './interfaces/http/jwt-auth.guard';
import { RolesGuard } from './interfaces/http/roles.guard';
import { AuthUseCase } from './application/use-cases/auth.use-case';
import { PostgresAuthRepository } from './infrastructure/persistence/postgres-auth.repository';
import { AUTH_REPOSITORY } from './domain/ports/auth.repository.port';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserEntity, RevokedTokenEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET no está definido');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>('JWT_EXPIRES_IN', '8h') ?? '8h') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthUseCase,
    PostgresAuthRepository,
    { provide: AUTH_REPOSITORY, useExisting: PostgresAuthRepository },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule, AUTH_REPOSITORY],
})
export class AuthModule {}
