import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { EmailPort } from '../../application/ports/email.port';

/** Lee una variable SMTP_* ignorando espacios y saltos de línea al borde (típicos al pegar). */
function smtpEnv(key: string) {
  const value = process.env[key]?.trim();
  return value === '' ? undefined : value;
}

/** Crea el transporte SMTP desde las variables de entorno (SMTP_*). */
export function createSmtpTransporter() {
  const host = smtpEnv('SMTP_HOST');
  const from = smtpEnv('SMTP_FROM');
  if (!host || !from) {
    throw new ServiceUnavailableException(
      'El servicio SMTP no está configurado',
    );
  }
  const port = Number(smtpEnv('SMTP_PORT') ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: smtpEnv('SMTP_SECURE') === 'true',
    auth:
      smtpEnv('SMTP_USER') && smtpEnv('SMTP_PASSWORD')
        ? {
            user: smtpEnv('SMTP_USER'),
            pass: smtpEnv('SMTP_PASSWORD'),
          }
        : undefined,
  });
}

@Injectable()
export class SmtpEmailAdapter implements EmailPort {
  async send(input: { to: string; subject: string; text: string }) {
    const transporter = createSmtpTransporter();
    await transporter.sendMail({ from: smtpEnv('SMTP_FROM'), ...input });
  }
}
