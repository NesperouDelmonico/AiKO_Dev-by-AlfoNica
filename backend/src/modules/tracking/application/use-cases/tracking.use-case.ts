import { Inject, Injectable } from '@nestjs/common';
import { TRACKING_REPOSITORY } from '../../domain/ports/tracking.repository.port';
import type { TrackingRepositoryPort } from '../../domain/ports/tracking.repository.port';

@Injectable()
export class TrackingUseCase {
  constructor(
    @Inject(TRACKING_REPOSITORY)
    private readonly repository: TrackingRepositoryPort,
  ) {}
  observations(_patientId: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - listar observaciones',
    );
  }
  createObservation(_patientId: string, _data: unknown): never {
    throw new Error('TODO: pendiente de lógica de negocio - crear observación');
  }
  updateObservation(_id: string, _text: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - editar observación',
    );
  }
  alerts(_patientId: string | undefined, _query: unknown): never {
    throw new Error('TODO: pendiente de lógica de negocio - listar alertas');
  }
  notifications(_patientId: string, _query: unknown): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - listar notificaciones',
    );
  }
  markRead(_id: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - marcar notificación como leída',
    );
  }
  preference(_patientId: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - consultar preferencia',
    );
  }
  savePreference(_patientId: string, _data: unknown): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - guardar preferencia',
    );
  }
}
