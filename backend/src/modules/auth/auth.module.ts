import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/domain/entities/user.entity';
import { RevokedTokenEntity } from './domain/entities/revoked-token.entity';
import { PasswordResetEntity } from './domain/entities/password-reset.entity';
import { AuthController } from './interfaces/http/auth.controller';
import { JwtAuthGuard } from './interfaces/http/jwt-auth.guard';
import { RolesGuard } from './interfaces/http/roles.guard';
import { AuthUseCase } from './application/use-cases/auth.use-case';
import { PostgresAuthRepository } from './infrastructure/persistence/postgres-auth.repository';
import { AUTH_REPOSITORY } from './domain/ports/auth.repository.port';
import { AuthScheduler } from './infrastructure/scheduler/auth.scheduler';

export function jwtOptionsFromConfig(
  config: ConfigService,
): JwtModuleOptions {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET no está definido');
  }
  if (
    config.get<string>('NODE_ENV') === 'production' &&
    Buffer.byteLength(secret, 'utf8') < 32
  ) {
    throw new Error('JWT_SECRET debe tener al menos 32 bytes en producción');
  }
  return {
    secret,
    signOptions: {
      expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
        '8h') as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'],
    },
  };
}

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      UserEntity,
      RevokedTokenEntity,
      PasswordResetEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtOptionsFromConfig,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthUseCase,
    AuthScheduler,
    PostgresAuthRepository,
    { provide: AUTH_REPOSITORY, useExisting: PostgresAuthRepository },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule, AUTH_REPOSITORY, AuthScheduler],
})
export class AuthModule {}
