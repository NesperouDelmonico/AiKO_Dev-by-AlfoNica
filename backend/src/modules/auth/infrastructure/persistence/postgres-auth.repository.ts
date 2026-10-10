import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { RevokedTokenEntity } from '../../domain/entities/revoked-token.entity';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
@Injectable()
export class PostgresAuthRepository implements AuthRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(RevokedTokenEntity)
    private readonly revokedTokens: Repository<RevokedTokenEntity>,
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
}
