import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PatientEntity } from '../../../users/domain/entities/patient.entity';
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
    wallet: jest.fn(),
    updateWallet: jest.fn(),
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
    expect(repository.awardBadge).toHaveBeenCalledWith(
      'patient-id',
      'badge-90',
    );
  });

  describe('tienda', () => {
    const me = { sub: 'patient-user', rol: UserRole.PACIENTE };
    const wallet = (over: Partial<PatientEntity> = {}) =>
      ({
        id: 'p1',
        monedas: 100,
        accesorio: 'base',
        accesorios: ['base'],
        potenciadorXpRestante: 0,
        salvadoresRacha: 0,
        diasProtegidos: [],
        ...over,
      }) as PatientEntity;
    // Aplica el cambio sobre una copia, como haría la transacción.
    const runWith = (start: PatientEntity) =>
      repository.updateWallet.mockImplementation((_id, change) => {
        const copy = { ...start, accesorios: [...start.accesorios] };
        change(copy);
        return Promise.resolve(copy);
      });

    beforeEach(() => {
      repository.patientExists.mockResolvedValue(true);
      repository.patientOwnedByUser.mockResolvedValue(true);
    });

    it('compra un accesorio, lo descuenta y se lo pone al osito', async () => {
      runWith(wallet());
      const result = await useCase.purchase('p1', 'gafas', me);
      expect(result).toMatchObject({
        monedas: 20,
        accesorio: 'gafas',
        accesorios: ['base', 'gafas'],
      });
    });

    it('el potenciador suma 3 ejercicios y el salvador uno', async () => {
      runWith(wallet());
      expect(
        (await useCase.purchase('p1', 'potenciador_xp', me))
          .potenciador_xp_restante,
      ).toBe(3);
      expect(
        (await useCase.purchase('p1', 'salvador_racha', me)).salvadores_racha,
      ).toBe(1);
    });

    it('rechaza monedas insuficientes, repetidos y el máximo de salvadores', async () => {
      runWith(wallet({ monedas: 10 }));
      await expect(useCase.purchase('p1', 'corona', me)).rejects.toThrow(
        'Te faltan 190 monedas',
      );
      await expect(useCase.purchase('p1', 'corona', me)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      runWith(wallet({ accesorios: ['base', 'gorra'] }));
      await expect(useCase.purchase('p1', 'gorra', me)).rejects.toBeInstanceOf(
        ConflictException,
      );
      runWith(wallet({ salvadoresRacha: 3 }));
      await expect(
        useCase.purchase('p1', 'salvador_racha', me),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(useCase.purchase('p1', 'nada', me)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('solo el propio paciente compra o cambia el accesorio', async () => {
      repository.patientOwnedByUser.mockResolvedValue(false);
      await expect(useCase.purchase('p1', 'gorra', me)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      const specialist = { sub: 'esp', rol: UserRole.ESPECIALISTA };
      await expect(
        useCase.equip('p1', 'gorra', specialist),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('solo se pone accesorios comprados', async () => {
      runWith(wallet({ accesorios: ['base', 'gorra'] }));
      await expect(useCase.equip('p1', 'corona', me)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(useCase.equip('p1', 'capa', me)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect((await useCase.equip('p1', 'gorra', me)).accesorio).toBe('gorra');
      expect((await useCase.equip('p1', 'base', me)).accesorio).toBe('base');
    });
  });
});
