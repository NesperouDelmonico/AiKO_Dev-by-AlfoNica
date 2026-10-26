import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersUseCase } from './users.use-case';
import type { UsersRepositoryPort } from '../../domain/ports/users.repository.port';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import type { EmailPort } from '../../../shared/application/ports/email.port';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersUseCase', () => {
  const repository: jest.Mocked<UsersRepositoryPort> = {
    list: jest.fn(),
    find: jest.fn(),
    findByEmail: jest.fn(),
    findByCedula: jest.fn(),
    hasAdministrator: jest.fn(),
    update: jest.fn(),
    setState: jest.fn(),
    setStateSafely: jest.fn(),
    setPassword: jest.fn(),
    resetPasswordAndNotify: jest.fn(),
    createInitialAdministrator: jest.fn(),
    createAdministrator: jest.fn(),
    createSpecialist: jest.fn(),
    indicators: jest.fn(),
    trends: jest.fn(),
    incidents: jest.fn(),
    createPatient: jest.fn(),
  };
  const email: jest.Mocked<EmailPort> = { send: jest.fn() };
  const useCase = new UsersUseCase(repository, email);
  const administrator = Object.assign(new UserEntity(), {
    id: 'admin-id',
    nombre: 'Admin',
    cedula: '12345678',
    correo: 'admin@example.com',
    contraseñaHash: '$2b$12$stored',
    rol: UserRole.ADMINISTRADOR,
    estado: true,
    intentosFallidos: 3,
    fechaCreacion: new Date(),
  });

  beforeEach(() => jest.clearAllMocks());

  it('rechaza desactivar al último administrador activo con 409', async () => {
    repository.setStateSafely.mockRejectedValue(
      new Error('LAST_ACTIVE_ADMINISTRATOR'),
    );

    await expect(
      useCase.executeState(administrator.id, false, 'other-admin'),
    ).rejects.toMatchObject({
      status: 409,
      message: 'No puedes desactivar al último administrador activo',
    });
  });

  it('rechaza la auto-desactivación del administrador con 409', async () => {
    repository.setStateSafely.mockRejectedValue(
      new Error('ADMIN_SELF_DEACTIVATION'),
    );

    await expect(
      useCase.executeState(administrator.id, false, administrator.id),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('solicita al repositorio reactivar y reiniciar intentos fallidos', async () => {
    repository.setStateSafely.mockResolvedValue({
      ...administrator,
      estado: true,
      intentosFallidos: 0,
    });

    await useCase.executeState(administrator.id, true, 'admin-actor');

    expect(repository.setStateSafely).toHaveBeenCalledWith(
      administrator.id,
      true,
      'admin-actor',
    );
  });

  it('mapea un unique_violation concurrente de correo a 409', async () => {
    repository.find.mockResolvedValue(administrator);
    repository.update.mockRejectedValue({
      driverError: {
        code: '23505',
        constraint: 'UQ_usuario_correo',
      },
    });

    await expect(
      useCase.executeUpdate(administrator.id, { correo: 'taken@example.com' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Correo duplicado',
    });
  });

  it('incluye especialista_id en listados y en la consulta de usuario', async () => {
    const specialist = Object.assign(new UserEntity(), {
      ...administrator,
      id: 'specialist-user-id',
      rol: UserRole.ESPECIALISTA,
      especialistaId: 'specialist-profile-id',
    });
    repository.list.mockResolvedValue({
      total: 1,
      page: 1,
      limit: 20,
      data: [specialist],
    });
    repository.find.mockResolvedValue(specialist);

    await expect(
      useCase.executeList({ page: 1, limit: 20, rol: UserRole.ESPECIALISTA }),
    ).resolves.toMatchObject({
      data: [{ id: specialist.id, especialista_id: 'specialist-profile-id' }],
    });
    await expect(useCase.executeGet(specialist.id)).resolves.toMatchObject({
      id: specialist.id,
      especialista_id: 'specialist-profile-id',
    });
  });

  it('incluye especialista_id en la respuesta de creación de especialista', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByCedula.mockResolvedValue(null);
    repository.createSpecialist.mockResolvedValue(
      Object.assign(new UserEntity(), {
        ...administrator,
        id: 'specialist-user-id',
        rol: UserRole.ESPECIALISTA,
        especialistaId: 'specialist-profile-id',
      }),
    );
    (
      bcrypt.hash as unknown as jest.Mock<Promise<string>, [string, number]>
    ).mockResolvedValue('$2b$12$new-hash');
    email.send.mockResolvedValue(undefined);

    await expect(
      useCase.executeSpecialist({
        nombre: 'Especialista',
        cedula: '12345679',
        correo: 'specialist@example.com',
      }),
    ).resolves.toMatchObject({
      id: 'specialist-user-id',
      especialista_id: 'specialist-profile-id',
    });
  });

  it('mapea un unique_violation concurrente de cédula a 409', async () => {
    repository.find.mockResolvedValue(administrator);
    repository.update.mockRejectedValue({
      driverError: {
        code: '23505',
        detail: 'Key (cedula)=(12345678) already exists.',
      },
    });

    await expect(
      useCase.executeUpdate(administrator.id, { cedula: '12345679' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Cédula duplicada',
    });
  });

  it.each([
    ['POST /usuarios/especialistas', 'specialist'],
    ['POST /usuarios/administradores', 'administrator'],
  ])('%s devuelve 409 cuando el correo ya existe', async (_label, kind) => {
    repository.findByEmail.mockResolvedValue(administrator);
    const input = {
      nombre: 'Cuenta nueva',
      cedula: '12345679',
      correo: 'admin@example.com',
    };

    const result =
      kind === 'specialist'
        ? useCase.executeSpecialist(input)
        : useCase.executeAdministrator(input);

    await expect(result).rejects.toMatchObject({ status: 409 });
  });

  it.each([
    ['POST /usuarios/especialistas', 'specialist'],
    ['POST /usuarios/administradores', 'administrator'],
  ])('%s devuelve 503 si falla la entrega de credenciales', async (_label, kind) => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByCedula.mockResolvedValue(null);
    repository.createSpecialist.mockResolvedValue(administrator);
    repository.createAdministrator.mockResolvedValue(administrator);
    repository.setState.mockResolvedValue(administrator);
    (
      bcrypt.hash as unknown as jest.Mock<Promise<string>, [string, number]>
    ).mockResolvedValue('$2b$12$new-hash');
    email.send.mockRejectedValue(new Error('SMTP failure'));
    const input = {
      nombre: 'Cuenta nueva',
      cedula: '12345679',
      correo: 'new@example.com',
    };

    const result =
      kind === 'specialist'
        ? useCase.executeSpecialist(input)
        : useCase.executeAdministrator(input);

    await expect(result).rejects.toMatchObject({ status: 503 });
    expect(repository.setState).toHaveBeenCalledWith(administrator.id, false);
  });

  it('genera y envía una contraseña temporal antes de restablecer la cuenta', async () => {
    repository.find.mockResolvedValue(administrator);
    email.send.mockResolvedValue(undefined);
    repository.resetPasswordAndNotify.mockImplementation(
      async (_id, _hash, notify) => {
        await notify();
        return administrator;
      },
    );
    (
      bcrypt.hash as unknown as jest.Mock<Promise<string>, [string, number]>
    ).mockResolvedValue('$2b$12$new-hash');

    await useCase.executeAdminPasswordReset(administrator.id);

    expect(repository.resetPasswordAndNotify).toHaveBeenCalledWith(
      administrator.id,
      '$2b$12$new-hash',
      expect.any(Function),
    );
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: administrator.correo,
        text: expect.stringMatching(/Contraseña temporal: .+Aa1/),
      }),
    );
    const sentPassword = email.send.mock.calls[0][0].text.match(
      /Contraseña temporal: (.+)\. Cámbiala/,
    )?.[1];
    expect(sentPassword).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/);
    expect(repository.resetPasswordAndNotify.mock.calls[0][1]).not.toBe(
      sentPassword,
    );
  });

  it('devuelve 503 y revierte el reset administrativo si falla el correo', async () => {
    repository.find.mockResolvedValue(administrator);
    repository.resetPasswordAndNotify.mockImplementation(
      async (_id, _hash, notify) => {
        await notify();
        return administrator;
      },
    );
    email.send.mockRejectedValue(new Error('SMTP failure'));
    (
      bcrypt.hash as unknown as jest.Mock<Promise<string>, [string, number]>
    ).mockResolvedValue('$2b$12$new-hash');

    await expect(
      useCase.executeAdminPasswordReset(administrator.id),
    ).rejects.toMatchObject({ status: 503 });
    expect(repository.resetPasswordAndNotify).toHaveBeenCalledTimes(1);
  });

  it('devuelve 404 si el usuario del reset administrativo no existe', async () => {
    repository.find.mockResolvedValue(null);
    await expect(
      useCase.executeAdminPasswordReset('missing-user'),
    ).rejects.toMatchObject({ status: 404 });
    expect(email.send).not.toHaveBeenCalled();
  });
});
