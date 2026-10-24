import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../modules/auth/interfaces/http/auth.decorators';
import { AuthScheduler } from '../modules/auth/infrastructure/scheduler/auth.scheduler';
import { TrackingScheduler } from '../modules/tracking/infrastructure/scheduler/tracking.scheduler';
import { createSmtpTransporter } from '../modules/shared/infrastructure/email/smtp-email.adapter';
import { CronSecretGuard } from './cron-secret.guard';

const MAX_REMINDER_WINDOW_MINUTES = 60;

/**
 * Disparadores HTTP de las tareas programadas, para entornos serverless donde
 * @nestjs/schedule no puede correr. Vive fuera de src/modules a propósito: son
 * rutas internas, no parte del contrato público de la API (verify:contract).
 * Vercel Cron solo hace peticiones GET.
 */
@ApiExcludeController()
@Public()
@UseGuards(CronSecretGuard)
@Controller('cron')
export class CronController {
  constructor(
    private readonly tracking: TrackingScheduler,
    private readonly auth: AuthScheduler,
  ) {}

  /** Equivale al @Cron diario de 1:00 a. m. (hora Bogotá). */
  @Get('evaluate-alerts')
  async evaluateAlerts() {
    await this.tracking.evaluatePatientAlerts();
    return { ok: true };
  }

  /** Equivale al @Cron diario de 2:00 a. m. (hora Bogotá). */
  @Get('purge-tokens')
  async purgeTokens() {
    await this.auth.purgeExpiredRevokedTokens();
    return { ok: true };
  }

  /**
   * Equivale al @Cron por minuto. `window` (minutos, 1-60) indica cada cuánto
   * se llama este endpoint: envía los recordatorios cuya hora cayó dentro de
   * esa ventana. Los duplicados ya los evita reminderSentSince.
   */
  @Get('send-reminders')
  async sendReminders(@Query('window') window?: string) {
    const minutes = window === undefined ? 1 : Number(window);
    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > MAX_REMINDER_WINDOW_MINUTES
    ) {
      throw new BadRequestException(
        `window debe ser un entero entre 1 y ${MAX_REMINDER_WINDOW_MINUTES}`,
      );
    }
    await this.tracking.sendConfiguredReminders(minutes);
    return { ok: true };
  }

  /**
   * Diagnóstico del SMTP: indica qué variables SMTP_* están presentes (sin
   * mostrar usuario ni contraseña) y si el servidor acepta la conexión y las
   * credenciales. No envía ningún correo.
   */
  @Get('smtp-check')
  async smtpCheck() {
    const env = process.env;
    const state = (key: string) => {
      const value = env[key];
      if (value === undefined) return 'ausente';
      if (value === '') return 'vacía';
      if (value !== value.trim()) return 'con espacios o saltos de línea al borde';
      return 'ok';
    };
    const variables = Object.fromEntries(
      [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_SECURE',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'SMTP_FROM',
      ].map((key) => [key, state(key)]),
    );
    const destino = { host: env.SMTP_HOST, puerto: env.SMTP_PORT };
    try {
      await createSmtpTransporter().verify();
      return { ok: true, variables, destino };
    } catch (error) {
      const e = error as {
        message?: string;
        code?: string;
        command?: string;
        responseCode?: number;
      };
      return {
        ok: false,
        variables,
        destino,
        error: {
          mensaje: e.message,
          codigo: e.code,
          comando: e.command,
          respuesta: e.responseCode,
        },
      };
    }
  }
}
