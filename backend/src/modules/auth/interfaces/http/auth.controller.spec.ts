import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthUseCase } from '../../application/use-cases/auth.use-case';
import { AuthController } from './auth.controller';

describe('AuthController password endpoints', () => {
  let app: INestApplication;
  const useCase = {
    changePassword: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    useCase.changePassword.mockResolvedValue(undefined);
    useCase.requestPasswordReset.mockResolvedValue({
      mensaje: 'Si la cuenta existe, recibirás instrucciones por correo',
    });
    useCase.resetPassword.mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthUseCase, useValue: useCase }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('v1');
    app.use((request, _response, next) => {
      Object.assign(request, {
        user: { sub: 'user-id', jti: 'token-id', exp: 1 },
      });
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('uses PATCH and returns 204 for authenticated password changes', async () => {
    await request(app.getHttpServer())
      .patch('/v1/auth/contrasena')
      .send({
        contraseña_actual: 'OldPassword1',
        nueva_contraseña: 'NewPassword1',
      })
      .expect(204);

    expect(useCase.changePassword).toHaveBeenCalledWith(
      'user-id',
      'OldPassword1',
      'NewPassword1',
    );
  });

  it('returns 202 for password recovery requests', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/olvide-contrasena')
      .send({ correo: 'user@example.com' })
      .expect(202);

    expect(useCase.requestPasswordReset).toHaveBeenCalledWith(
      'user@example.com',
    );
  });

  it('returns 204 after resetting a password with the existing body fields', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/restablecer-contrasena')
      .send({
        correo: 'user@example.com',
        codigo: '123456',
        nueva_contraseña: 'NewPassword1',
      })
      .expect(204);

    expect(useCase.resetPassword).toHaveBeenCalledWith(
      'user@example.com',
      '123456',
      'NewPassword1',
    );
  });
});
