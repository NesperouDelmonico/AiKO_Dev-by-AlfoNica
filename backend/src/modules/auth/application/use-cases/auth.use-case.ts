import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY } from '../../domain/ports/auth.repository.port';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
@Injectable()
export class AuthUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepositoryPort,
  ) {}
  executeLogin(_correo: string, _contraseña: string): Promise<never> {
    throw new Error('TODO: pendiente de lógica de negocio - login');
  }
  executeLogout(_userId: string): Promise<never> {
    throw new Error('TODO: pendiente de lógica de negocio - logout');
  } 
  executeMe(_userId: string): Promise<never> {
    throw new Error('TODO: pendiente de lógica de negocio - me');
  }
}
