import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { AUTH_REPOSITORY } from '../../domain/ports/auth.repository.port';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';

@Injectable()
export class AuthUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepositoryPort,
    private readonly jwt: JwtService,
  ) {}

  async executeLogin(correo: string, contraseña: string) {
    const user = await this.repository.findByEmail(correo);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (!user.estado) throw new UnauthorizedException('Credenciales inválidas');
    if (user.intentosFallidos >= 5) {
      throw new HttpException('Cuenta bloqueada', HttpStatus.LOCKED);
    }

    const passwordMatches = await bcrypt.compare(
      contraseña,
      user.contraseñaHash,
    );
    if (!passwordMatches) {
      const attempts = await this.repository.recordFailedLogin(user.id);
      if (attempts >= 5) {
        throw new HttpException('Cuenta bloqueada', HttpStatus.LOCKED);
      }
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.repository.resetFailedLogins(user.id);
    const tokenId = randomUUID();
    const token = await this.jwt.signAsync(
      { sub: user.id, rol: user.rol },
      { jwtid: tokenId },
    );
    return { token, rol: user.rol, usuario: this.publicUser(user) };
  }

  async executeLogout(tokenId: string, expiresAt: number) {
    if (tokenId && expiresAt) {
      await this.repository.revokeSession(tokenId, new Date(expiresAt * 1000));
    }
  }

  async executeMe(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user || !user.estado) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.publicUser(user);
  }

  private publicUser(user: UserEntity) {
    return {
      id: user.id,
      nombre: user.nombre,
      cedula: user.cedula,
      correo: user.correo,
      rol: user.rol,
      estado: user.estado,
      intentos_fallidos: user.intentosFallidos,
      fecha_creacion: user.fechaCreacion,
    };
  }
}
