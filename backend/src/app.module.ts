import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './entities';
import { TherapyModule } from './modules/therapy/therapy.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { IncidentsModule } from './modules/users/incidents.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';
import { SharedModule } from './modules/shared/shared.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  postgresConnection,
  shouldRunMigrations,
  shouldSynchronize,
} from './database/connection';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // En serverless (Vercel) no hay proceso permanente: los @Cron no corren.
    // SCHEDULER_ENABLED=false los desactiva y las tareas se disparan por HTTP
    // desde CronModule (Vercel Cron o un pinger externo).
    ...(process.env.SCHEDULER_ENABLED === 'false'
      ? []
      : [ScheduleModule.forRoot()]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rateLimit = Number(config.get<string>('RATE_LIMIT_MAX', '100'));
        if (!Number.isInteger(rateLimit) || rateLimit < 1) {
          throw new Error('RATE_LIMIT_MAX debe ser un entero positivo');
        }
        return [{ ttl: 60_000, limit: rateLimit }];
      },
    }),
    SharedModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...postgresConnection(),
      entities,
      autoLoadEntities: true,
      synchronize: shouldSynchronize(),
      migrationsRun: shouldRunMigrations(),
      migrations: ['dist/database/migrations/*{.ts,.js}'],
      // En Vercel conviene fallar rápido y dejar el error en los logs en vez
      // de reintentar 10 veces con 3 s de espera hasta que la función muera.
      retryAttempts: process.env.VERCEL ? 1 : 10,
      retryDelay: process.env.VERCEL ? 500 : 3000,
    }),
    TherapyModule,
    GamificationModule,
    TrackingModule,
    IncidentsModule,
    AuthModule,
    UsersModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
