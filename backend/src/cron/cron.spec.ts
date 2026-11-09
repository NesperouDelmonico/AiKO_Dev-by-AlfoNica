import {
  BadRequestException,
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CronController } from './cron.controller';
import { CronSecretGuard } from './cron-secret.guard';
import { readServiceAccount } from './push-check';

function contextWith(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

describe('CronSecretGuard', () => {
  const guard = new CronSecretGuard();
  const previous = process.env.CRON_SECRET;
  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it('queda cerrado si CRON_SECRET no está configurado', () => {
    delete process.env.CRON_SECRET;
    expect(() => guard.canActivate(contextWith('Bearer x'))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('rechaza un secreto demasiado corto', () => {
    process.env.CRON_SECRET = 'corto';
    expect(() => guard.canActivate(contextWith('Bearer corto'))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('acepta el Bearer correcto', () => {
    process.env.CRON_SECRET = 'secreto-de-prueba-largo';
    expect(
      guard.canActivate(contextWith('Bearer secreto-de-prueba-largo')),
    ).toBe(true);
  });

  it.each([
    undefined,
    '',
    'Bearer otro-secreto-distinto',
    'secreto-de-prueba-largo',
  ])('rechaza la credencial %p', (header) => {
    process.env.CRON_SECRET = 'secreto-de-prueba-largo';
    expect(() => guard.canActivate(contextWith(header))).toThrow(
      UnauthorizedException,
    );
  });
});

describe('CronController', () => {
  const tracking = {
    evaluatePatientAlerts: jest.fn().mockResolvedValue(undefined),
    sendConfiguredReminders: jest.fn().mockResolvedValue(undefined),
  };
  const auth = {
    purgeExpiredRevokedTokens: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new CronController(tracking as never, auth as never);
  beforeEach(() => jest.clearAllMocks());

  it('dispara cada tarea', async () => {
    await expect(controller.evaluateAlerts()).resolves.toEqual({ ok: true });
    await expect(controller.purgeTokens()).resolves.toEqual({ ok: true });
    expect(tracking.evaluatePatientAlerts).toHaveBeenCalledTimes(1);
    expect(auth.purgeExpiredRevokedTokens).toHaveBeenCalledTimes(1);
  });

  it('usa ventana de 1 minuto por defecto y acepta window', async () => {
    await controller.sendReminders();
    await controller.sendReminders('5');
    expect(tracking.sendConfiguredReminders).toHaveBeenNthCalledWith(1, 1);
    expect(tracking.sendConfiguredReminders).toHaveBeenNthCalledWith(2, 5);
  });

  it.each(['0', '61', '1.5', 'abc', ''])('rechaza window=%p', async (value) => {
    await expect(controller.sendReminders(value)).rejects.toThrow(
      BadRequestException,
    );
    expect(tracking.sendConfiguredReminders).not.toHaveBeenCalled();
  });
});

describe('CronController.smtpCheck', () => {
  it('reporta variables ausentes sin lanzar excepción', async () => {
    const saved = { ...process.env };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SMTP_')) delete process.env[key];
    }
    try {
      const controller = new CronController({} as never, {} as never);
      const result = await controller.smtpCheck();
      expect(result.ok).toBe(false);
      expect(result.variables.SMTP_HOST).toBe('ausente');
    } finally {
      process.env = saved;
    }
  });
});

describe('readServiceAccount', () => {
  it('describe la variable sin exponer la llave', () => {
    expect(readServiceAccount(undefined).info.variable).toBe('ausente');
    expect(readServiceAccount(' ').info.variable).toBe('vacía');
    expect(readServiceAccount('{x').info.variable).toBe('no es un JSON válido');
    expect(readServiceAccount('{"project_info":{}}').info.variable).toContain(
      'google-services.json',
    );
    const ok = readServiceAccount(
      JSON.stringify({
        type: 'service_account',
        project_id: 'aiko',
        client_email: 'push@aiko.iam.gserviceaccount.com',
        private_key: 'KEY',
      }),
    );
    expect(ok.info).toEqual({
      variable: 'ok',
      proyecto: 'aiko',
      cuenta: 'push@aiko.iam.gserviceaccount.com',
    });
    expect(JSON.stringify(ok.info)).not.toContain('KEY');
    expect(ok.account?.privateKey).toBe('KEY');
  });
});
