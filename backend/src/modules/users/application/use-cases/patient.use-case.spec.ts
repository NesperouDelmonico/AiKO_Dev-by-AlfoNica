import { ConflictException } from '@nestjs/common';
import { PatientUseCase } from './patient.use-case';
import type { PatientRepositoryPort } from '../../domain/ports/patient.repository.port';
import type { UsersRepositoryPort } from '../../domain/ports/users.repository.port';
import type { EmailPort } from '../../../shared/application/ports/email.port';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import { PatientEntity } from '../../domain/entities/patient.entity';

describe('PatientUseCase', () => {
  const patients: jest.Mocked<PatientRepositoryPort> = {
    specialistIdForUser: jest.fn(),
    create: jest.fn(),
    listAssigned: jest.fn(),
    search: jest.fn(),
    findById: jest.fn(),
    assign: jest.fn(),
    updateThresholds: jest.fn(),
  };
  const users: jest.Mocked<UsersRepositoryPort> = {
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
  const useCase = new PatientUseCase(patients, users, email);
  const patientUser = Object.assign(new UserEntity(), {
    id: 'patient-user',
    nombre: 'Paciente',
    cedula: '12345678',
    correo: 'patient@example.com',
    rol: UserRole.PACIENTE,
    estado: true,
    intentosFallidos: 0,
  });
  const patient = Object.assign(new PatientEntity(), {
    id: 'patient-id',
    usuario: patientUser,
    especialista: {
      id: 'specialist-id',
      usuario: { id: 'specialist-user', correo: 'specialist@example.com' },
    },
    nivelActual: 1,
    xpTotal: 0,
    umbralBajoRendimiento: 60,
    umbralDiasInactividad: 7,
    fechaAsignacion: new Date(),
  });

  beforeEach(() => jest.clearAllMocks());

  it('resuelve la alta única y desactiva la cuenta si falla el correo', async () => {
    patients.specialistIdForUser.mockResolvedValue('specialist-id');
    patients.create.mockResolvedValue(patient);
    email.send.mockRejectedValue(new Error('SMTP unavailable'));
    users.setState.mockResolvedValue(patientUser);

    await expect(
      useCase.create(
        {
          nombre: 'Paciente',
          cedula: '12345678',
          correo: 'patient@example.com',
          umbral_bajo_rendimiento: 60,
          umbral_dias_inactividad: 7,
        },
        'specialist-user',
      ),
    ).rejects.toThrow('SMTP unavailable');

    expect(patients.create).toHaveBeenCalledTimes(1);
    expect(users.setState).toHaveBeenCalledWith(patientUser.id, false);
  });

  it('traduce la colisión SQL concurrente de alta de paciente a 409', async () => {
    patients.specialistIdForUser.mockResolvedValue('specialist-id');
    users.findByEmail.mockResolvedValue(null);
    users.findByCedula.mockResolvedValue(null);
    patients.create.mockRejectedValue({
      driverError: {
        code: '23505',
        detail: 'Key (cedula)=(12345678) already exists.',
      },
    });

    await expect(
      useCase.create(
        {
          nombre: 'Paciente',
          cedula: '12345678',
          correo: 'patient@example.com',
          umbral_bajo_rendimiento: 60,
          umbral_dias_inactividad: 7,
        },
        'specialist-user',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(email.send).not.toHaveBeenCalled();
  });

  it('rechaza la reasignación a un especialista inactivo con 409', async () => {
    patients.findById.mockResolvedValue(patient);
    patients.assign.mockRejectedValue(new Error('SPECIALIST_INACTIVE'));

    await expect(
      useCase.assign(
        patient.id,
        { especialista_id: 'inactive-specialist' },
        { sub: 'specialist-user', rol: UserRole.ESPECIALISTA },
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
