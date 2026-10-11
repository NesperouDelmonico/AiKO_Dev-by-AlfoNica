import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { EmailPort } from '../../application/ports/email.port';

@Injectable()
export class SmtpEmailAdapter implements EmailPort {
  async send(input: { to: string; subject: string; text: string }) {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) {
      throw new ServiceUnavailableException(
        'El servicio SMTP no está configurado',
      );
    }

    const port = Number(process.env.SMTP_PORT ?? 587);
    const transporter = nodemailer.createTransport({
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
    await transporter.sendMail({ from, ...input });
  }
}
