import { Inject, Injectable } from '@nestjs/common';
import { THERAPY_REPOSITORY } from '../../domain/ports/therapy.repository.port';
import type { TherapyRepositoryPort } from '../../domain/ports/therapy.repository.port';

@Injectable()
export class TherapyUseCase {
  constructor(
    @Inject(THERAPY_REPOSITORY)
    private readonly repository: TherapyRepositoryPort,
  ) {}
  list(_query: unknown): never {
    throw new Error('TODO: pendiente de lógica de negocio - listar ejercicios');
  }
  create(_data: unknown): never {
    throw new Error('TODO: pendiente de lógica de negocio - crear ejercicio');
  }
  get(_id: string): never {
    throw new Error('TODO: pendiente de lógica de negocio - obtener ejercicio');
  }
  update(_id: string, _data: unknown): never {
    throw new Error('TODO: pendiente de lógica de negocio - editar ejercicio');
  }
  status(_id: string, _status: unknown): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - cambiar estado de ejercicio',
    );
  }
  execute(_id: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - ejecutar ejercicio',
    );
  }
  route(_patientId: string, _items: unknown): never {
    throw new Error('TODO: pendiente de lógica de negocio - crear ruta');
  }
  activeRoute(_patientId: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - obtener ruta activa',
    );
  }
  progress(_routeId: string): never {
    throw new Error('TODO: pendiente de lógica de negocio - calcular progreso');
  }
  add(_routeId: string, _data: unknown): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - agregar ejercicio a ruta',
    );
  }
  remove(_routeExerciseId: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - eliminar ejercicio de ruta',
    );
  }
  replace(_routeExerciseId: string, _exerciseId: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - reemplazar ejercicio',
    );
  }
  result(_routeId: string, _routeExerciseId: string, _data: unknown): never {
    throw new Error('TODO: pendiente de lógica de negocio - guardar resultado');
  }
  results(_patientId: string): never {
    throw new Error('TODO: pendiente de lógica de negocio - listar resultados');
  }
  domainProgress(_patientId: string, _desde?: string, _hasta?: string): never {
    throw new Error(
      'TODO: pendiente de lógica de negocio - progreso por dominio',
    );
  }
  temporalProgress(
    _patientId: string,
    _desde?: string,
    _hasta?: string,
  ): never {
    throw new Error('TODO: pendiente de lógica de negocio - progreso temporal');
  }
}
