import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { RevokedTokenEntity } from '../../domain/entities/revoked-token.entity';
import { PasswordResetEntity } from '../../domain/entities/password-reset.entity';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
@Injectable()
export class PostgresAuthRepository implements AuthRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(RevokedTokenEntity)
    private readonly revokedTokens: Repository<RevokedTokenEntity>,
    @InjectRepository(PasswordResetEntity)
    private readonly passwordResets: Repository<PasswordResetEntity>,
  ) {}
  findByEmail(correo: string) {
    return this.users.findOne({ where: { correo } });
  }
  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }
  async recordFailedLogin(id: string) {
    await this.users.increment({ id }, 'intentosFallidos', 1);
    const user = await this.users.findOneByOrFail({ id });
    return user.intentosFallidos;
  }
  async resetFailedLogins(id: string) {
    await this.users.update(id, { intentosFallidos: 0 });
  }
  async revokeSession(tokenId: string, expiresAt: Date) {
    await this.revokedTokens.upsert({ tokenId, expiresAt }, ['tokenId']);
  }
  async isSessionRevoked(tokenId: string) {
    return this.revokedTokens.exists({
      where: { tokenId, expiresAt: MoreThan(new Date()) },
    });
  }
  async purgeExpiredRevokedTokens() {
    const result = await this.revokedTokens
      .createQueryBuilder()
      .delete()
      .where('"expira_en" < :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }
  async purgeExpiredPasswordResets() {
    const result = await this.passwordResets
      .createQueryBuilder()
      .delete()
      .where('"expira_en" < :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }
  async createPasswordReset(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    await this.passwordResets.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        userId,
      ]);
      await manager
        .createQueryBuilder()
        .delete()
        .from(PasswordResetEntity)
        .where('"usuario_id" = :userId', { userId })
        .execute();
      await manager.save(
        PasswordResetEntity,
        manager.create(PasswordResetEntity, {
          tokenHash,
          usuario: { id: userId },
          expiresAt,
        }),
      );
    });
  }
  async resetPasswordWithToken(
    email: string,
    tokenHash: string,
    passwordHash: string,
  ) {
    return this.passwordResets.manager.transaction(async (manager) => {
      const reset = await manager
        .createQueryBuilder(PasswordResetEntity, 'reset')
        .innerJoinAndSelect('reset.usuario', 'usuario')
        .setLock('pessimistic_write')
        .where('usuario.correo = :email', { email })
        .andWhere('reset.expiresAt > :now', { now: new Date() })
        .andWhere('reset.attempts < 5')
        .getOne();
      if (!reset) return false;
      if (reset.tokenHash !== tokenHash) {
        reset.attempts += 1;
        await manager.save(reset);
        return false;
      }

      await manager.update(
        UserEntity,
        { id: reset.usuario.id },
        { contraseñaHash: passwordHash, intentosFallidos: 0 },
      );
      await manager
        .createQueryBuilder()
        .delete()
        .from(PasswordResetEntity)
        .where('"usuario_id" = :userId', { userId: reset.usuario.id })
        .execute();
      return true;
    });
  }
  async updatePassword(userId: string, passwordHash: string) {
    await this.users.manager.transaction(async (manager) => {
      await manager.update(
        UserEntity,
        { id: userId },
        { contraseñaHash: passwordHash, intentosFallidos: 0 },
      );
      await manager
        .createQueryBuilder()
        .delete()
        .from(PasswordResetEntity)
        .where('"usuario_id" = :userId', { userId })
        .execute();
    });
  }
}
