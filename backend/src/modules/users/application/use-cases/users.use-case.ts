import { Inject, Injectable } from '@nestjs/common';
import { USERS_REPOSITORY } from '../../domain/ports/users.repository.port';
import type { UsersRepositoryPort } from '../../domain/ports/users.repository.port';
@Injectable()
export class UsersUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly repository: UsersRepositoryPort,
  ) {}
  executeList(_query: unknown): Promise<never> {
    throw new Error('TODO: pendiente de lógica de negocio - listar usuarios');
  }
  executeUpdate(_id: string, _data: unknown): Promise<never> {
    throw new Error('TODO: pendiente de lógica de negocio - editar usuario');
  }
  executeState(_id: string, _estado: boolean): Promise<never> {
    throw new Error('TODO: pendiente de lógica de negocio - estado de usuario');
  }
  executeInitialAdministrator(_data: unknown): Promise<never> {
    throw new Error(
      'TODO: pendiente de lógica de negocio - administrador inicial',
    );
  }
  executeAdministrator(_data: unknown): Promise<never> {
    throw new Error(
      'TODO: pendiente de lógica de negocio - crear administrador',
    );
  }
  executeSpecialist(_data: unknown): Promise<never> {
    throw new Error(
      'TODO: pendiente de lógica de negocio - crear especialista',
    );
  }
  executeGet(_id: string): Promise<never> {
    throw new Error('TODO: pendiente de lógica de negocio - obtener usuario');
  }
}
