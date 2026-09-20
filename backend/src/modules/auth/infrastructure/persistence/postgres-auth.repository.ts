import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
@Injectable()
export class PostgresAuthRepository implements AuthRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}
  findByEmail(correo: string) {
    return this.users.findOne({ where: { correo } });
  }
  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }
  async revokeSession(_id: string) {
    return;
  }
}
