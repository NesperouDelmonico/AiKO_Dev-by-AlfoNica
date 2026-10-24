import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EMAIL_PORT } from '../../../shared/application/ports/email.port';
import type { EmailPort } from '../../../shared/application/ports/email.port';
import { AlertType } from '../../domain/entities/alert.entity';
import { NotificationType } from '../../domain/entities/notification.entity';
import { ReminderFrequency } from '../../domain/entities/notification-preference.entity';
import { TRACKING_REPOSITORY } from '../../domain/ports/tracking.repository.port';
import type { TrackingRepositoryPort } from '../../domain/ports/tracking.repository.port';
import { PUSH_PORT } from '../../domain/ports/push.port';
import type { PushPort } from '../../domain/ports/push.port';
import { Inject } from '@nestjs/common';

const REMINDER_TIME_ZONE = 'America/Bogota';

@Injectable()
export class TrackingScheduler {
  private readonly logger = new Logger(TrackingScheduler.name);

  constructor(
    @Inject(TRACKING_REPOSITORY)
    private readonly repository: TrackingRepositoryPort,
    @Inject(EMAIL_PORT)
    private readonly email: EmailPort,
    @Inject(PUSH_PORT)
    private readonly push: PushPort,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async evaluatePatientAlerts() {
    const patients = await this.repository.patientsForMonitoring();
    const now = new Date();
    for (const patient of patients) {
      const recent = await this.repository.recentResults(patient.id, 3);
      const lastActivity = recent[0]?.fecha ?? patient.fechaAsignacion;
      const inactiveDays = Math.floor(
        (now.getTime() - new Date(lastActivity).getTime()) / 86_400_000,
      );

      if (inactiveDays >= patient.umbralDiasInactividad) {
        await this.createAlertAndNotify(
          patient,
          AlertType.INACTIVIDAD,
          `No se registra actividad terapéutica hace ${inactiveDays} días.`,
        );
      } else {
        await this.repository.resolveAlerts(patient.id, AlertType.INACTIVIDAD);
      }

      const lowPerformance =
        recent.length >= 3 &&
        recent.reduce((total, result) => total + result.puntaje, 0) /
          recent.length <
          patient.umbralBajoRendimiento;
      if (lowPerformance) {
        await this.createAlertAndNotify(
          patient,
          AlertType.BAJO_RENDIMIENTO,
          `El rendimiento promedio reciente está por debajo del umbral configurado (${patient.umbralBajoRendimiento}).`,
        );
      } else {
        await this.repository.resolveAlerts(
          patient.id,
          AlertType.BAJO_RENDIMIENTO,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sendConfiguredReminders(windowMinutes = 1) {
    const now = new Date();
    const localParts = new Intl.DateTimeFormat('en-US', {
      timeZone: REMINDER_TIME_ZONE,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const local = Object.fromEntries(
      localParts.map((part) => [part.type, part.value]),
    );
    const nowMinutes = Number(local.hour ?? 0) * 60 + Number(local.minute ?? 0);
    const preferences = await this.repository.preferences();
    for (const preference of preferences) {
      // Con windowMinutes=1 equivale a la coincidencia exacta de hh:mm de
      // antes; una ventana mayor tolera disparadores externos menos frecuentes.
      const [hours, minutes] = preference.horarioRecordatorio.split(':');
      const scheduledMinutes = Number(hours) * 60 + Number(minutes);
      const elapsed = (nowMinutes - scheduledMinutes + 1440) % 1440;
      if (!Number.isFinite(elapsed) || elapsed >= windowMinutes) continue;
      if (preference.frecuencia === ReminderFrequency.NINGUNA) continue;
      if (
        preference.frecuencia === ReminderFrequency.SEMANAL &&
        local.weekday !== 'Mon'
      )
        continue;
      if (
        preference.frecuencia !== ReminderFrequency.DIARIA &&
        preference.frecuencia !== ReminderFrequency.SEMANAL
      )
        continue;
      const duplicateWindow =
        preference.frecuencia === ReminderFrequency.SEMANAL
          ? 6 * 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000
          : 22 * 60 * 60 * 1000;
      if (
        await this.repository.reminderSentSince(
          preference.pacienteId,
          new Date(now.getTime() - duplicateWindow),
        )
      )
        continue;

      const message =
        'Recuerda completar los ejercicios de tu ruta terapéutica.';
      await this.repository.createNotification(
        preference.pacienteId,
        NotificationType.RECORDATORIO,
        message,
      );
      await this.push.sendToPatient(
        preference.pacienteId,
        'Recordatorio de AiKO',
        message,
      );
      try {
        await this.email.send({
          to: preference.paciente.usuario.correo,
          subject: 'Recordatorio de AiKO',
          text: message,
        });
      } catch (error) {
        this.logger.warn(
          `No se pudo enviar recordatorio del paciente ${preference.pacienteId}: ${String(error)}`,
        );
      }
    }
  }

  private async createAlertAndNotify(
    patient: {
      id: string;
      usuario: { correo: string; nombre: string };
      especialista: { usuario: { correo: string } };
    },
    type: AlertType,
    message: string,
  ) {
    if (await this.repository.activeAlert(patient.id, type)) return;
    await this.repository.createAlert(patient.id, type);
    await this.push.sendToPatient(
      patient.id,
      `Alerta de seguimiento AiKO: ${type}`,
      message,
    );
    try {
      await this.email.send({
        to: patient.especialista.usuario.correo,
        subject: `Alerta de seguimiento AiKO: ${type}`,
        text: `Paciente ${patient.usuario.nombre}. ${message}`,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar la alerta del paciente ${patient.id}: ${String(error)}`,
      );
    }
  }
}
