import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthUseCase } from './auth.use-case';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
import {
  UserEntity,
  UserRole,
} from '../../../users/domain/entities/user.entity';
import type { EmailPort } from '../../../shared/application/ports/email.port';
import { LoginDto } from '../dto/auth.dto';
import { validate } from 'class-validator';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthUseCase', () => {
  const repository: jest.Mocked<AuthRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findPatientId: jest.fn(),
    recordFailedLogin: jest.fn(),
    resetFailedLogins: jest.fn(),
    revokeSession: jest.fn(),
    isSessionRevoked: jest.fn(),
    purgeExpiredRevokedTokens: jest.fn(),
    purgeExpiredPasswordResets: jest.fn(),
    createPasswordReset: jest.fn(),
    resetPasswordWithToken: jest.fn(),
    updatePassword: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };
  const email: jest.Mocked<EmailPort> = { send: jest.fn() };
  const useCase = new AuthUseCase(repository, jwt as never, email);
  const user = Object.assign(new UserEntity(), {
    id: 'user-id',
    nombre: 'Paciente',
    cedula: '12345678',
    correo: 'patient@example.com',
    contraseñaHash: '$2b$12$storedhash',
    rol: UserRole.PACIENTE,
    estado: true,
    intentosFallidos: 0,
    fechaCreacion: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'unit-test-jwt-secret';
  });

  it.each([
    ['no existe', null],
    ['está inactiva', Object.assign(new UserEntity(), user, { estado: false })],
  ])(
    'hace bcrypt.compare antes de rechazar una cuenta que %s',
    async (_, found) => {
      repository.findByEmail.mockResolvedValue(found);
      const compare = bcrypt.compare as unknown as jest.Mock<
        Promise<boolean>,
        [string, string]
      >;
      compare.mockResolvedValue(false);

      await expect(
        useCase.executeLogin('patient@example.com', 'WrongPassword1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(compare).toHaveBeenCalledWith(
        'WrongPassword1',
        '$2b$12$IDEh8D1icMYXukGkF7e5ueOkR46NGCi/Zo1GYzbkYwFEn4IHnpJzm',
      );
    },
  );

  it('responde con el mismo rechazo y bloquea a los cinco intentos', async () => {
    repository.findByEmail.mockResolvedValue(user);
    repository.recordFailedLogin.mockResolvedValue(5);
    (
      bcrypt.compare as unknown as jest.Mock<Promise<boolean>, [string, string]>
    ).mockResolvedValue(false);

    await expect(
      useCase.executeLogin(user.correo, 'WrongPassword1'),
    ).rejects.toMatchObject({ status: 423 });
    expect(repository.recordFailedLogin.mock.calls).toContainEqual([user.id]);
  });

  it('limpia los intentos después de un restablecimiento exitoso', async () => {
    repository.resetPasswordWithToken.mockResolvedValue(true);
    (
      bcrypt.hash as unknown as jest.Mock<Promise<string>, [string, number]>
    ).mockResolvedValue('$2b$12$new-hash');

    await expect(
      useCase.resetPassword(user.correo, '123456', 'NewPassword1'),
    ).resolves.toEqual({ mensaje: 'Contraseña restablecida' });
    expect(repository.resetPasswordWithToken.mock.calls[0]).toEqual([
      user.correo,
      expect.any(String),
      '$2b$12$new-hash',
    ]);
  });

  it('no filtra si una dirección existe al solicitar restablecimiento', async () => {
    repository.findByEmail.mockResolvedValue(null);
    await expect(
      useCase.requestPasswordReset('missing@example.com'),
    ).resolves.toEqual({
      mensaje: 'Si la cuenta existe, recibirás instrucciones por correo',
    });
    expect(email.send.mock.calls).toHaveLength(0);
  });

  it('almacena solo el hash del código de restablecimiento', async () => {
    repository.findByEmail.mockResolvedValue(user);
    email.send.mockResolvedValue();

    await useCase.requestPasswordReset(user.correo);

    const [, storedHash] = repository.createPasswordReset.mock.calls[0];
    const [sentMessage] = email.send.mock.calls[0];
    const code = sentMessage.text.match(/: (\d{6})$/)?.[1];
    expect(code).toMatch(/^\d{6}$/);
    expect(storedHash).not.toBe(code);
    expect(storedHash).toHaveLength(64);
    expect(
      repository.createPasswordReset.mock.calls[0][2].getTime(),
    ).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
    expect(
      repository.createPasswordReset.mock.calls[0][2].getTime(),
    ).toBeLessThan(Date.now() + 16 * 60 * 1000);
  });

  it('no expone el hash de contraseña en /auth/me', async () => {
    repository.findById.mockResolvedValue(user);
    const result = await useCase.executeMe(user.id);
    expect(result).not.toHaveProperty('contraseñaHash');
    expect(result).not.toHaveProperty('contraseña_hash');
  });

  it('incluye paciente_id en /auth/me solo para pacientes', async () => {
    repository.findPatientId.mockResolvedValue('patient-1');
    repository.findById.mockResolvedValue({
      ...user,
      rol: UserRole.PACIENTE,
    } as UserEntity);
    expect(await useCase.executeMe(user.id)).toMatchObject({
      paciente_id: 'patient-1',
    });

    repository.findPatientId.mockClear();
    repository.findById.mockResolvedValue({
      ...user,
      rol: UserRole.ESPECIALISTA,
    } as UserEntity);
    expect(await useCase.executeMe(user.id)).not.toHaveProperty('paciente_id');
    expect(repository.findPatientId).not.toHaveBeenCalled();
  });

  it('aplica longitud máxima 72 al DTO de login', async () => {
    const dto = Object.assign(new LoginDto(), {
      correo: 'patient@example.com',
      contraseña: 'x'.repeat(73),
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'contraseña')).toBe(true);
  });

  it('permite cambiar contraseña solo con la contraseña actual válida', async () => {
    repository.findById.mockResolvedValue(user);
    repository.updatePassword.mockResolvedValue();
    (
      bcrypt.compare as unknown as jest.Mock<Promise<boolean>, [string, string]>
    ).mockResolvedValue(true);
    (
      bcrypt.hash as unknown as jest.Mock<Promise<string>, [string, number]>
    ).mockResolvedValue('$2b$12$updated-hash');

    await expect(
      useCase.changePassword(user.id, 'CurrentPassword1', 'NewPassword1'),
    ).resolves.toEqual({ mensaje: 'Contraseña actualizada' });
    expect(repository.updatePassword.mock.calls).toContainEqual([
      user.id,
      '$2b$12$updated-hash',
    ]);
  });

  it('rechaza el cambio si la contraseña actual no coincide', async () => {
    repository.findById.mockResolvedValue(user);
    (
      bcrypt.compare as unknown as jest.Mock<Promise<boolean>, [string, string]>
    ).mockResolvedValue(false);

    await expect(
      useCase.changePassword(user.id, 'WrongPassword1', 'NewPassword1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.updatePassword.mock.calls).toHaveLength(0);
  });
});
