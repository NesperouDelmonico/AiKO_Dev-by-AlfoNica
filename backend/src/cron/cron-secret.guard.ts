import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const MIN_SECRET_LENGTH = 16;

/**
 * Protege los endpoints de cron. Vercel Cron envía automáticamente
 * `Authorization: Bearer <CRON_SECRET>` cuando la variable CRON_SECRET existe
 * en el proyecto; cualquier otro pinger debe enviar el mismo encabezado.
 * Sin CRON_SECRET configurado el endpoint queda cerrado (nunca abierto).
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new ServiceUnavailableException(
        'CRON_SECRET no está configurado (mínimo 16 caracteres)',
      );
    }
    const request = context.switchToHttp().getRequest<Request>();
    const received = Buffer.from(request.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new UnauthorizedException('Credencial de cron inválida');
    }
    return true;
  }
}
