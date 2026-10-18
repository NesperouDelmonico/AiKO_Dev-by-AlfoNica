import {
  Controller,
  Get,
  INestApplication,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Express } from 'express';
import request from 'supertest';
import { parseTrustProxy } from '../src/trust-proxy';

@Controller('probe')
class ThrottledProbeController {
  @Get()
  @UseGuards(ThrottlerGuard)
  probe() {
    return { ok: true };
  }
}

describe('TRUST_PROXY and request throttling', () => {
  let app: INestApplication | undefined;

  async function startApp(setting: string) {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])],
      controllers: [ThrottledProbeController],
    }).compile();
    app = module.createNestApplication();
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.set('trust proxy', parseTrustProxy(setting));
    await app.init();
    return app;
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('counts requests by the forwarded client IP when the proxy is trusted', async () => {
    const instance = await startApp('true');

    for (let client = 1; client <= 6; client++) {
      await request(instance.getHttpServer())
        .get('/probe')
        .set('X-Forwarded-For', `198.51.100.${client}`)
        .expect(200);
    }
  }, 60_000);

  it('counts requests by the direct proxy IP when proxy trust is disabled', async () => {
    const instance = await startApp('false');
    const statuses: number[] = [];

    for (let client = 1; client <= 6; client++) {
      const response = await request(instance.getHttpServer())
        .get('/probe')
        .set('X-Forwarded-For', `198.51.100.${client}`);
      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  }, 60_000);
});
