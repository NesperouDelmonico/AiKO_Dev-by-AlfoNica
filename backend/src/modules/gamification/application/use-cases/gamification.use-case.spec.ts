import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GamificationUseCase } from './gamification.use-case';
import type { GamificationRepositoryPort } from '../../domain/ports/gamification.repository.port';
import type { PushPort } from '../../../tracking/domain/ports/push.port';
import { UserRole } from '../../../users/domain/entities/user.entity';

describe('GamificationUseCase access and badge conditions', () => {
  const repository = {
    patientExists: jest.fn(),
    patientOwnedByUser: jest.fn(),
    patientAssignedToSpecialist: jest.fn(),
    badges: jest.fn(),
    profile: jest.fn(),
    patientBadges: jest.fn(),
    unlocked: jest.fn(),
    metrics: jest.fn(),
    awardBadge: jest.fn(),
    createNotification: jest.fn(),
  } as jest.Mocked<GamificationRepositoryPort>;
  const push = { sendToPatient: jest.fn() } as jest.Mocked<PushPort>;
  const useCase = new GamificationUseCase(repository, push);

  beforeEach(() => jest.clearAllMocks());

  it('deniega al paciente el perfil, insignias y contenido de otro paciente', async () => {
    repository.patientExists.mockResolvedValue(true);
    repository.patientOwnedByUser.mockResolvedValue(false);
    const patientActor = {
      sub: 'patient-user',
      rol: UserRole.PACIENTE,
    };

    await expect(
      useCase.profile('patient-other', patientActor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      useCase.patientBadges('patient-other', patientActor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      useCase.unlocked('patient-other', patientActor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deniega a un especialista que consulta un paciente no asignado', async () => {
    repository.patientExists.mockResolvedValue(true);
    repository.patientAssignedToSpecialist.mockResolvedValue(false);

    await expect(
      useCase.patientBadges('patient-id', {
        sub: 'specialist-user',
        rol: UserRole.ESPECIALISTA,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('responde 404 cuando el paciente no existe', async () => {
    repository.patientExists.mockResolvedValue(false);

    await expect(
      useCase.unlocked('missing-patient', {
        sub: 'patient-user',
        rol: UserRole.PACIENTE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.patientOwnedByUser).not.toHaveBeenCalled();
  });

  it('otorga la insignia cuando mejor_puntaje alcanza el umbral 90', async () => {
    const badge = { id: 'badge-90', condicion: 'mejor_puntaje >= 90' };
    const awarded = { insignia: badge };
    repository.metrics.mockResolvedValue({
      nivel: 1,
      sesiones: 1,
      mejor_puntaje: 90,
    });
    repository.badges.mockResolvedValue([badge] as never);
    repository.awardBadge.mockResolvedValue(awarded as never);
    repository.createNotification.mockResolvedValue({} as never);
    push.sendToPatient.mockResolvedValue();

    await expect(useCase.onExerciseCompleted('patient-id', 1)).resolves.toEqual(
      [awarded],
    );
    expect(repository.awardBadge).toHaveBeenCalledWith('patient-id', 'badge-90');
  });
});
