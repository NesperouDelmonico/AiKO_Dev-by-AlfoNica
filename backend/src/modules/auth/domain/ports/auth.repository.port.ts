import { UserEntity } from '../../../users/domain/entities/user.entity';
export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');
export interface AuthRepositoryPort {
  findByEmail(correo: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  revokeSession(id: string): Promise<void>;
}
