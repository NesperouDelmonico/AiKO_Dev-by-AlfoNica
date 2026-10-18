import { Global, Module } from '@nestjs/common';
import { EMAIL_PORT } from './application/ports/email.port';
import { SmtpEmailAdapter } from './infrastructure/email/smtp-email.adapter';

@Global()
@Module({
  providers: [
    SmtpEmailAdapter,
    { provide: EMAIL_PORT, useExisting: SmtpEmailAdapter },
  ],
  exports: [EMAIL_PORT],
})
export class SharedModule {}
