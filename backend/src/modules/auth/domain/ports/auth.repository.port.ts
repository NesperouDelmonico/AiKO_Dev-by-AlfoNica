import { UserEntity } from '../../../users/domain/entities/user.entity';
export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');
export interface AuthRepositoryPort {
  findByEmail(correo: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  recordFailedLogin(id: string): Promise<number>;
  resetFailedLogins(id: string): Promise<void>;
  revokeSession(tokenId: string, expiresAt: Date): Promise<void>;
  isSessionRevoked(tokenId: string): Promise<boolean>;
  purgeExpiredRevokedTokens(): Promise<number>;
  purgeExpiredPasswordResets(): Promise<number>;
  createPasswordReset(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  resetPasswordWithToken(
    email: string,
    tokenHash: string,
    passwordHash: string,
  ): Promise<boolean>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
