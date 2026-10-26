import { ConflictException } from '@nestjs/common';
import { PatientUseCase } from './patient.use-case';
import type { PatientRepositoryPort } from '../../domain/ports/patient.repository.port';
import type { UsersRepositoryPort } from '../../domain/ports/users.repository.port';
import type { EmailPort } from '../../../shared/application/ports/email.port';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import { PatientEntity } from '../../domain/entities/patient.entity';
import { CreatePatientDto, UpdatePatientDto } from '../dto/patient.dto';
import { validate } from 'class-validator';

describe('PatientUseCase', () => {
  const patients: jest.Mocked<PatientRepositoryPort> = {
    specialistIdForUser: jest.fn(),
    create: jest.fn(),
    listAssigned: jest.fn(),
    search: jest.fn(),
    findById: jest.fn(),
    assign: jest.fn(),
    updateThresholds: jest.fn(),
    updateBirthDate: jest.fn(),
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
      usuario: {
        id: 'specialist-user',
        nombre: 'Especialista',
        correo: 'specialist@example.com',
      },
    },
    nivelActual: 1,
    xpTotal: 0,
    umbralBajoRendimiento: 60,
    umbralDiasInactividad: 7,
    fechaAsignacion: new Date(),
    fechaNacimiento: '1990-06-15',
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
          fecha_nacimiento: '2008-06-15',
          umbral_bajo_rendimiento: 60,
          umbral_dias_inactividad: 7,
        },
        'specialist-user',
      ),
    ).rejects.toMatchObject({
      status: 503,
      message: 'No se pudo entregar el correo; la cuenta quedó inactiva',
    });

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
          fecha_nacimiento: '1990-06-15',
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

  it('valida fecha ISO y permite edades fuera del rango de 30 a 60 años', async () => {
    const dto = Object.assign(new CreatePatientDto(), {
      nombre: 'Paciente',
      cedula: '12345678',
      correo: 'patient@example.com',
      fecha_nacimiento: '1990-06-15',
      umbral_bajo_rendimiento: 60,
      umbral_dias_inactividad: 7,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);

    const invalid = Object.assign(new UpdatePatientDto(), {
      fecha_nacimiento: '2024-02-30',
    });
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });

  it('rechaza el PATCH vacío y bloquea a especialistas sin asignación', async () => {
    await expect(
      useCase.update(patient.id, {}, {
        sub: 'specialist-user',
        rol: UserRole.ESPECIALISTA,
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      useCase.update(
        patient.id,
        { fecha_nacimiento: '1991-06-15' },
        { sub: 'other-specialist', rol: UserRole.ESPECIALISTA },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('responde 403 si un especialista no asignado consulta el paciente y 404 si no existe', async () => {
    patients.findById.mockResolvedValue(patient);
    await expect(
      useCase.get(patient.id, {
        sub: 'other-specialist',
        rol: UserRole.ESPECIALISTA,
      }),
    ).rejects.toMatchObject({ status: 403 });

    patients.findById.mockResolvedValue(null);
    await expect(
      useCase.get(patient.id, {
        sub: 'specialist-user',
        rol: UserRole.ESPECIALISTA,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('devuelve los campos personales al actualizar la fecha de nacimiento', async () => {
    const updatedPatient = Object.assign(new PatientEntity(), {
      ...patient,
      fechaNacimiento: '1991-06-15',
    });
    patients.findById.mockResolvedValue(patient);
    patients.updateBirthDate.mockResolvedValue(updatedPatient);

    await expect(
      useCase.update(
        patient.id,
        { fecha_nacimiento: '1991-06-15' },
        { sub: 'specialist-user', rol: UserRole.ESPECIALISTA },
      ),
    ).resolves.toMatchObject({
      nombre: 'Paciente',
      correo: 'patient@example.com',
      cedula: '12345678',
      estado: true,
      fecha_nacimiento: '1991-06-15',
      edad: expect.any(Number),
    });
  });

  it('busca con filtros y pagina antes de serializar los agregados del paciente', async () => {
    const listedPatient = Object.assign(new PatientEntity(), patient, {
      alertasActivas: 2,
      progresoRuta: {
        rutaId: 'active-route',
        total: 3,
        completados: 1,
        porcentaje: 100 / 3,
      },
    });
    patients.specialistIdForUser.mockResolvedValue('specialist-id');
    patients.search.mockResolvedValue({
      total: 25,
      page: 2,
      limit: 10,
      data: [listedPatient],
    });

    await expect(
      useCase.search(
        {
          q: 'Ana',
          estado: 'true',
          nivel: 2,
          page: 2,
          limit: 10,
        },
        { sub: 'specialist-user', rol: UserRole.ESPECIALISTA },
      ),
    ).resolves.toMatchObject({
      total: 25,
      page: 2,
      limit: 10,
      data: [
        {
          nombre: 'Paciente',
          correo: 'patient@example.com',
          cedula: '12345678',
          estado: true,
          fecha_nacimiento: '1990-06-15',
          edad: expect.any(Number),
          especialista_nombre: 'Especialista',
          alertas_activas: 2,
          progreso_ruta: {
            ruta_id: 'active-route',
            total: 3,
            completados: 1,
            porcentaje: 100 / 3,
          },
        },
      ],
    });
    expect(patients.search).toHaveBeenCalledWith(
      { query: 'Ana', estado: 'true', nivel: 2, page: 2, limit: 10 },
      'specialist-id',
    );
  });
});
