import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { EmailPort } from '../../application/ports/email.port';

/** Crea el transporte SMTP desde las variables de entorno (SMTP_*). */
export function createSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) {
    throw new ServiceUnavailableException(
      'El servicio SMTP no está configurado',
    );
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });
}

@Injectable()
export class SmtpEmailAdapter implements EmailPort {
  async send(input: { to: string; subject: string; text: string }) {
    const transporter = createSmtpTransporter();
    await transporter.sendMail({ from: process.env.SMTP_FROM, ...input });
  }
}
