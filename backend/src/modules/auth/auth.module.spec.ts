import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jwtOptionsFromConfig } from './auth.module';

describe('JWT startup configuration', () => {
  const config = (values: Record<string, string>) =>
    ({
      get: (key: string, fallback?: string) => values[key] ?? fallback,
    }) as unknown as ConfigService;

  it('refuses to initialize without JWT_SECRET', () => {
    expect(() => jwtOptionsFromConfig(config({}))).toThrow(
      'JWT_SECRET no está definido',
    );
  });

  it('uses an eight-hour expiration by default', () => {
    const jwt = new JwtService(
      jwtOptionsFromConfig(config({ JWT_SECRET: 'test-secret' })),
    );
    const payload = jwt.decode(jwt.sign({ sub: 'user-id' })) as {
      iat: number;
      exp: number;
    };

    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
  });
});
