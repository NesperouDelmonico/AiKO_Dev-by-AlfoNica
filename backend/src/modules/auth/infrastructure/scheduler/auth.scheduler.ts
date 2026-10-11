import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AUTH_REPOSITORY } from '../../domain/ports/auth.repository.port';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class AuthScheduler {
  private readonly logger = new Logger(AuthScheduler.name);

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthRepositoryPort,
  ) {}

  @Cron('0 0 2 * * *', { timeZone: 'America/Bogota' })
  async purgeExpiredRevokedTokens() {
    const [sessions, passwordResets] = await Promise.all([
      this.repository.purgeExpiredRevokedTokens(),
      this.repository.purgeExpiredPasswordResets(),
    ]);
    this.logger.log(
      `Filas vencidas eliminadas: ${sessions} sesiones revocadas, ${passwordResets} códigos de restablecimiento`,
    );
  }
}
