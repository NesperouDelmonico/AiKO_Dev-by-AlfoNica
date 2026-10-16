import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { TrackingModule } from '../modules/tracking/tracking.module';
import { CronController } from './cron.controller';

@Module({
  imports: [AuthModule, TrackingModule],
  controllers: [CronController],
})
export class CronModule {}
