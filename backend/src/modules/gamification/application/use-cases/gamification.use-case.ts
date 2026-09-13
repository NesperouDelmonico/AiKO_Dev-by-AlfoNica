import { Inject, Injectable } from '@nestjs/common';
import { GAMIFICATION_REPOSITORY } from '../../domain/ports/gamification.repository.port';
import type { GamificationRepositoryPort } from '../../domain/ports/gamification.repository.port';

@Injectable()
export class GamificationUseCase {
  constructor(
    @Inject(GAMIFICATION_REPOSITORY)
    private readonly repository: GamificationRepositoryPort,
  ) {}
  badges(): never {
    throw new Error('TODO: pendiente de lógica de negocio - listar insignias');
  }
  profile(_patientId: string): never {
    throw new Error('TODO: pendiente de lógica de negocio - perfil de logros');
  }
  patientBadges(_patientId: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - insignias del paciente',
    );
  }
  unlocked(_patientId: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - contenido desbloqueado',
    );
  }
}
