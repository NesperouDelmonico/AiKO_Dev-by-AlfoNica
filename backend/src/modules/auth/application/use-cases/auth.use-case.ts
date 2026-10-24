import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import {
  UserEntity,
  UserRole,
} from '../../../users/domain/entities/user.entity';
import { AUTH_REPOSITORY } from '../../domain/ports/auth.repository.port';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
import { EMAIL_PORT } from '../../../shared/application/ports/email.port';
import type { EmailPort } from '../../../shared/application/ports/email.port';
import { isPasswordPolicyCompliant } from '../../../shared/application/password-policy';

const DUMMY_PASSWORD_HASH =
  '$2b$12$IDEh8D1icMYXukGkF7e5ueOkR46NGCi/Zo1GYzbkYwFEn4IHnpJzm';
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthUseCase {
  private readonly logger = new Logger(AuthUseCase.name);

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepositoryPort,
    private readonly jwt: JwtService,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
  ) {}

  async executeLogin(correo: string, contraseña: string) {
    const user = await this.repository.findByEmail(correo);
    if (!user || !user.estado) {
      await bcrypt.compare(contraseña, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException('Credenciales inválidas');
    }
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
    return { token, rol: user.rol, usuario: await this.sessionUser(user) };
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
    return this.sessionUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    this.assertPasswordPolicy(newPassword);
    const user = await this.repository.findById(userId);
    if (
      !user ||
      !(await bcrypt.compare(currentPassword, user.contraseñaHash))
    ) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    await this.repository.updatePassword(
      userId,
      await bcrypt.hash(newPassword, 12),
    );
    return { mensaje: 'Contraseña actualizada' };
  }

  async requestPasswordReset(correo: string) {
    const user = await this.repository.findByEmail(correo);
    if (!user || !user.estado)
      return {
        mensaje: 'Si la cuenta existe, recibirás instrucciones por correo',
      };

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const tokenHash = this.hashResetCode(correo, code);
    await this.repository.createPasswordReset(
      user.id,
      tokenHash,
      new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    );
    try {
      await this.email.send({
        to: user.correo,
        subject: 'Restablecimiento de contraseña AiKO',
        text: `Usa este código para restablecer tu contraseña. Vence en 15 minutos y admite hasta ${PASSWORD_RESET_MAX_ATTEMPTS} intentos: ${code}`,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo entregar un código de restablecimiento al usuario ${user.id}: ${String(error)}`,
      );
    }
    return {
      mensaje: 'Si la cuenta existe, recibirás instrucciones por correo',
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    this.assertPasswordPolicy(newPassword);
    const tokenHash = this.hashResetCode(email, code);
    const reset = await this.repository.resetPasswordWithToken(
      email,
      tokenHash,
      await bcrypt.hash(newPassword, 12),
    );
    if (!reset) {
      throw new BadRequestException(
        'Código de restablecimiento inválido o vencido',
      );
    }
    return { mensaje: 'Contraseña restablecida' };
  }

  private hashResetCode(email: string, code: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET es requerido');
    return createHmac('sha256', secret)
      .update(`${email.toLowerCase()}:${code}`)
      .digest('hex');
  }

  private assertPasswordPolicy(password: string) {
    if (!isPasswordPolicyCompliant(password)) {
      throw new BadRequestException(
        'La contraseña debe tener entre 8 y 72 caracteres e incluir minúscula, mayúscula y número',
      );
    }
  }

  /**
   * Usuario público de la sesión. Para pacientes añade `paciente_id`: las rutas
   * /pacientes/:id/... usan el id del perfil de paciente, no el del usuario.
   */
  private async sessionUser(user: UserEntity) {
    const base = this.publicUser(user);
    if (user.rol !== UserRole.PACIENTE) return base;
    return {
      ...base,
      paciente_id: await this.repository.findPatientId(user.id),
    };
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
