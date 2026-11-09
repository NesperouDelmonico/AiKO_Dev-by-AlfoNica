import { Injectable, Logger } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PUSH_PORT } from '../../domain/ports/push.port';
import type { PushPort, PushReport } from '../../domain/ports/push.port';
import { TRACKING_REPOSITORY } from '../../domain/ports/tracking.repository.port';
import type { TrackingRepositoryPort } from '../../domain/ports/tracking.repository.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class FirebasePushAdapter implements PushPort {
  private readonly logger = new Logger(FirebasePushAdapter.name);

  constructor(
    @Inject(TRACKING_REPOSITORY)
    private readonly repository: TrackingRepositoryPort,
  ) {}

  async sendToPatient(
    patientId: string,
    title: string,
    body: string,
  ): Promise<PushReport> {
    const report: PushReport = {
      configurado: false,
      dispositivos: 0,
      enviados: 0,
      fallidos: 0,
      errores: [],
    };
    const app = this.firebaseApp();
    if (!app) return report;
    report.configurado = true;
    const devices = await this.repository.deviceTokens(patientId);
    report.dispositivos = devices.length;
    if (devices.length === 0) return report;
    const messaging = getMessaging(app);

    for (let start = 0; start < devices.length; start += 500) {
      const batch = devices.slice(start, start + 500);
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
          notification: { title, body },
          data: { patientId },
          android: { priority: 'high' },
        });
        report.enviados += response.successCount;
        report.fallidos += response.failureCount;
        const invalidTokens: string[] = [];
        response.responses.forEach((result, index) => {
          const code = result.error?.code;
          if (code) report.errores.push(code);
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(batch[index].token);
          }
        });
        await Promise.all(
          invalidTokens.map((token) =>
            this.repository.removeDeviceToken(token),
          ),
        );
      } catch (error) {
        report.fallidos += batch.length;
        report.errores.push(String(error));
        this.logger.error(
          `Firebase push failed for patient ${patientId}: ${String(error)}`,
        );
      }
    }
    return report;
  }

  private firebaseApp() {
    const serializedAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serializedAccount) return null;
    try {
      const account = JSON.parse(serializedAccount);
      const appName = 'aiko-push';
      return (
        getApps().find((app) => app.name === appName) ??
        initializeApp({ credential: cert(account) }, appName)
      );
    } catch (error) {
      this.logger.error(`Firebase credentials are invalid: ${String(error)}`);
      return null;
    }
  }
}
