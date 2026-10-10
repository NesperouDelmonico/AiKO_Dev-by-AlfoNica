import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { isPasswordPolicyCompliant } from '../../../shared/application/password-policy';
import { mapUserUniqueViolation } from '../../../shared/infrastructure/persistence/map-user-unique-violation';
import { EMAIL_PORT } from '../../../shared/application/ports/email.port';
import type { EmailPort } from '../../../shared/application/ports/email.port';
import { USERS_REPOSITORY } from '../../domain/ports/users.repository.port';
import type { UsersRepositoryPort } from '../../domain/ports/users.repository.port';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import type {
  AccountDto,
  InitialAdministratorDto,
  UpdateUserDto,
  UsersQueryDto,
} from '../dto/users.dto';

class CredentialDeliveryError extends Error {}

@Injectable()
export class UsersUseCase {
  private readonly logger = new Logger(UsersUseCase.name);

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly repository: UsersRepositoryPort,
    @Inject(EMAIL_PORT)
    private readonly email: EmailPort,
  ) {}

  async executeList(query: UsersQueryDto) {
    const role = query.rol as UserRole | undefined;
    const result = await this.repository.list(
      query.page,
      query.limit,
      role,
      query.estado,
      query.q,
    );
    return {
      ...result,
      data: result.data.map((user) => this.publicUser(user)),
    };
  }

  async executeGet(id: string) {
    const user = await this.repository.find(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.publicUser(user);
  }

  async executeUpdate(id: string, data: UpdateUserDto) {
    const current = await this.repository.find(id);
    if (!current) throw new NotFoundException('Usuario no encontrado');
    if (data.correo && data.correo !== current.correo) {
      const duplicate = await this.repository.findByEmail(data.correo);
      if (duplicate) throw new ConflictException('Correo duplicado');
    }
    if (data.cedula && data.cedula !== current.cedula) {
      const duplicate = await this.repository.findByCedula(data.cedula);
      if (duplicate) throw new ConflictException('Cédula duplicada');
    }
    let updated: UserEntity | null;
    try {
      updated = await this.repository.update(id, data);
    } catch (error) {
      mapUserUniqueViolation(error);
      throw error;
    }
    if (!updated) throw new NotFoundException('Usuario no encontrado');
    this.logger.log(`Usuario actualizado: ${id}`);
    return this.publicUser(updated);
  }

  async executeState(id: string, estado: boolean, actorId: string) {
    let user: UserEntity | null;
    try {
      user = await this.repository.setStateSafely(id, estado, actorId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'ADMIN_SELF_DEACTIVATION'
      ) {
        throw new ConflictException('No puedes desactivarte a ti mismo');
      }
      if (
        error instanceof Error &&
        error.message === 'LAST_ACTIVE_ADMINISTRATOR'
      ) {
        throw new ConflictException(
          'No puedes desactivar al último administrador activo',
        );
      }
      throw error;
    }
    if (!user) throw new NotFoundException('Usuario no encontrado');
    this.logger.warn(`Estado de usuario actualizado: ${id} -> ${estado}`);
    return this.publicUser(user);
  }

  async executeInitialAdministrator(data: InitialAdministratorDto) {
    await this.assertUnique(data.correo, data.cedula);
    const contraseñaHash = await bcrypt.hash(data.contraseña, 12);
    let user: UserEntity | null;
    try {
      user = await this.repository.createInitialAdministrator({
        nombre: data.nombre,
        cedula: data.cedula,
        correo: data.correo,
        contraseñaHash,
        estado: true,
        intentosFallidos: 0,
      });
    } catch (error) {
      mapUserUniqueViolation(error);
      throw error;
    }
    if (!user) throw new ConflictException('Ya existe un administrador');
    this.logger.warn(`Administrador inicial creado: ${user.id}`);
    return this.publicUser(user);
  }

  executeAdministrator(data: AccountDto) {
    return this.createInvitedAccount(data, UserRole.ADMINISTRADOR);
  }

  executeSpecialist(data: AccountDto) {
    return this.createInvitedAccount(data, UserRole.ESPECIALISTA);
  }

  async executeAdminPasswordReset(id: string) {
    const temporaryPassword = `${randomBytes(24).toString('base64url')}Aa1`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const user = await this.repository.find(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    let updated: UserEntity | null;
    try {
      updated = await this.repository.resetPasswordAndNotify(
        id,
        passwordHash,
        async () => {
          try {
            await this.email.send({
              to: user.correo,
              subject: 'Restablecimiento de contraseña AiKO',
              text: `Tu administrador restableció tu contraseña. Contraseña temporal: ${temporaryPassword}. Cámbiala al ingresar.`,
            });
          } catch (error) {
            throw new CredentialDeliveryError('No se pudo entregar el correo', {
              cause: error,
            });
          }
        },
      );
    } catch (error) {
      if (error instanceof CredentialDeliveryError) {
        throw new ServiceUnavailableException(
          'No se pudo entregar la contraseña temporal; la cuenta no fue modificada',
        );
      }
      throw error;
    }
    if (!updated) throw new NotFoundException('Usuario no encontrado');
    this.logger.warn(`Contraseña restablecida por administrador: ${id}`);
  }

  executeIndicators() {
    return this.repository.indicators();
  }

  executeTrends(period: 'semanal' | 'mensual') {
    return this.repository.trends(period === 'semanal' ? 'week' : 'month');
  }

  private async createInvitedAccount(data: AccountDto, role: UserRole) {
    await this.assertUnique(data.correo, data.cedula);
    const temporaryPassword = `${randomBytes(18).toString('base64url')}A7`;
    const contraseñaHash = await bcrypt.hash(temporaryPassword, 12);
    const userData: Partial<UserEntity> = {
      nombre: data.nombre,
      cedula: data.cedula,
      correo: data.correo,
      contraseñaHash,
      estado: true,
      intentosFallidos: 0,
    };
    let user: UserEntity;
    try {
      user =
        role === UserRole.ADMINISTRADOR
          ? await this.repository.createAdministrator(userData)
          : await this.repository.createSpecialist(userData);
    } catch (error) {
      mapUserUniqueViolation(error);
      throw error;
    }

    try {
      await this.email.send({
        to: user.correo,
        subject: 'Acceso a AiKO',
        text: `Tu cuenta fue creada. Contraseña temporal: ${temporaryPassword}. Cámbiala al ingresar.`,
      });
    } catch (error) {
      await this.repository.setState(user.id, false);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'No se pudo entregar las credenciales; la cuenta quedó inactiva',
      );
    }

    this.logger.warn(
      `Cuenta ${role} creada y credenciales enviadas: ${user.id}`,
    );
    return this.publicUser(user);
  }

  private async assertUnique(correo: string, cedula: string) {
    const [emailUser, identityUser] = await Promise.all([
      this.repository.findByEmail(correo),
      this.repository.findByCedula(cedula),
    ]);
    if (emailUser) throw new ConflictException('Correo duplicado');
    if (identityUser) throw new ConflictException('Cédula duplicada');
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
