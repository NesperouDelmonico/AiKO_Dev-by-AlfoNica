import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { EMAIL_PORT } from '../../../shared/application/ports/email.port';
import type { EmailPort } from '../../../shared/application/ports/email.port';
import { USERS_REPOSITORY } from '../../domain/ports/users.repository.port';
import type { UsersRepositoryPort } from '../../domain/ports/users.repository.port';
import { PATIENT_REPOSITORY } from '../../domain/ports/patient.repository.port';
import type { PatientRepositoryPort } from '../../domain/ports/patient.repository.port';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import { mapUserUniqueViolation } from '../../../shared/infrastructure/persistence/map-user-unique-violation';
import type {
  AssignPatientDto,
  CreatePatientDto,
  PatientThresholdsDto,
  PatientsQueryDto,
  SearchPatientsQueryDto,
  UpdatePatientDto,
} from '../dto/patient.dto';
import { ageInBogota } from '../patient-birth-date';

@Injectable()
export class PatientUseCase {
  private readonly logger = new Logger(PatientUseCase.name);

  constructor(
    @Inject(PATIENT_REPOSITORY)
    private readonly patients: PatientRepositoryPort,
    @Inject(USERS_REPOSITORY)
    private readonly users: UsersRepositoryPort,
    @Inject(EMAIL_PORT)
    private readonly email: EmailPort,
  ) {}

  async create(data: CreatePatientDto, specialistUserId: string) {
    const specialistId = await this.requireSpecialist(specialistUserId);
    await this.assertUnique(data.correo, data.cedula);
    const temporaryPassword = `${randomBytes(18).toString('base64url')}A7`;
    const user = new UserEntity();
    user.nombre = data.nombre;
    user.cedula = data.cedula;
    user.correo = data.correo;
    user.contraseñaHash = await bcrypt.hash(temporaryPassword, 12);
    user.rol = UserRole.PACIENTE;
    user.estado = true;
    user.intentosFallidos = 0;

    let patient: Awaited<ReturnType<PatientRepositoryPort['create']>>;
    try {
      patient = await this.patients.create(user, specialistId, {
        umbralBajoRendimiento: data.umbral_bajo_rendimiento,
        umbralDiasInactividad: data.umbral_dias_inactividad,
        fechaNacimiento: data.fecha_nacimiento,
      });
    } catch (error) {
      mapUserUniqueViolation(error);
      throw error;
    }
    try {
      await this.email.send({
        to: data.correo,
        subject: 'Acceso a AiKO',
        text: `Tu especialista creó tu cuenta. Contraseña temporal: ${temporaryPassword}.`,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar las credenciales al paciente ${patient.usuario.id}: ${String(error)}`,
      );
      await this.users.setState(patient.usuario.id, false);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'No se pudo entregar el correo; la cuenta quedó inactiva',
      );
    }
    return this.publicPatient(patient);
  }

  async listAssigned(query: PatientsQueryDto, specialistUserId: string) {
    const specialistId = await this.requireSpecialist(specialistUserId);
    const result = await this.patients.listAssigned(
      specialistId,
      query.page,
      query.limit,
      query.q,
    );
    return {
      ...result,
      data: result.data.map((patient) =>
        this.publicPatient(patient, {
          alertas_activas: patient.alertasActivas,
          progreso_ruta: patient.progresoRuta
            ? {
                ruta_id: patient.progresoRuta.rutaId,
                total: patient.progresoRuta.total,
                completados: patient.progresoRuta.completados,
                porcentaje: patient.progresoRuta.porcentaje,
              }
            : null,
        }),
      ),
    };
  }

  async search(
    query: SearchPatientsQueryDto,
    actor: { sub: string; rol: UserRole },
  ) {
    const specialistId =
      actor.rol === UserRole.ESPECIALISTA
        ? await this.requireSpecialist(actor.sub)
        : undefined;
    const result = await this.patients.search(
      {
        query: query.q,
        estado: query.estado,
        nivel: query.nivel,
        page: query.page,
        limit: query.limit,
      },
      specialistId,
    );
    return {
      ...result,
      data: result.data.map((patient) =>
        this.publicPatient(patient, {
          alertas_activas: patient.alertasActivas,
          progreso_ruta: patient.progresoRuta
            ? {
                ruta_id: patient.progresoRuta.rutaId,
                total: patient.progresoRuta.total,
                completados: patient.progresoRuta.completados,
                porcentaje: patient.progresoRuta.porcentaje,
              }
            : null,
        }),
      ),
    };
  }

  async get(id: string, actor: { sub: string; rol: UserRole }) {
    const patient = await this.patients.findById(id);
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    await this.assertCanManagePatient(patient, actor);
    return this.publicPatient(patient);
  }

  async assign(
    id: string,
    data: AssignPatientDto,
    actor: { sub: string; rol: UserRole },
  ) {
    const current = await this.patients.findById(id);
    if (!current) throw new NotFoundException('Paciente no encontrado');
    await this.assertCanManagePatient(current, actor);
    let assigned: Awaited<ReturnType<PatientRepositoryPort['assign']>>;
    try {
      assigned = await this.patients.assign(id, data.especialista_id);
    } catch (error) {
      if (error instanceof Error && error.message === 'SPECIALIST_INACTIVE') {
        throw new ConflictException(
          'No se puede asignar un especialista inactivo',
        );
      }
      throw error;
    }
    if (!assigned)
      throw new NotFoundException('Paciente o especialista no encontrado');

    await Promise.all([
      this.email.send({
        to: assigned.usuario.correo,
        subject: 'Actualización de especialista en AiKO',
        text: `Tu especialista de seguimiento fue actualizado.`,
      }),
      this.email.send({
        to: assigned.especialista.usuario.correo,
        subject: 'Paciente asignado en AiKO',
        text: `Se te asignó el paciente ${assigned.usuario.nombre}.`,
      }),
    ]);
    this.logger.log(
      `Paciente ${id} asignado a especialista ${data.especialista_id}`,
    );
    return this.publicPatient(assigned);
  }

  async thresholds(
    id: string,
    data: PatientThresholdsDto,
    actor: { sub: string; rol: UserRole },
  ) {
    const patient = await this.patients.findById(id);
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    await this.assertCanManagePatient(patient, actor);
    const updated = await this.patients.updateThresholds(id, {
      umbralBajoRendimiento: data.umbral_bajo_rendimiento,
      umbralDiasInactividad: data.umbral_dias_inactividad,
    });
    if (!updated) throw new NotFoundException('Paciente no encontrado');
    return this.publicPatient(updated);
  }

  async update(
    id: string,
    data: UpdatePatientDto,
    actor: { sub: string; rol: UserRole },
  ) {
    if (data.fecha_nacimiento === undefined) {
      throw new BadRequestException('Debe enviar fecha_nacimiento');
    }
    const patient = await this.patients.findById(id);
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    await this.assertCanManagePatient(patient, actor);
    const updated = await this.patients.updateBirthDate(
      id,
      data.fecha_nacimiento,
    );
    if (!updated) throw new NotFoundException('Paciente no encontrado');
    return this.publicPatient(updated);
  }

  private async requireSpecialist(userId: string) {
    const specialistId = await this.patients.specialistIdForUser(userId);
    if (!specialistId)
      throw new ForbiddenException('Se requiere una cuenta especialista');
    return specialistId;
  }

  private async assertCanManagePatient(
    patient: Awaited<ReturnType<PatientRepositoryPort['findById']>> & {},
    actor: { sub: string; rol: UserRole },
  ) {
    if (actor.rol === UserRole.ADMINISTRADOR) return;
    if (
      actor.rol !== UserRole.ESPECIALISTA ||
      patient.especialista?.usuario?.id !== actor.sub
    ) {
      throw new ForbiddenException(
        'El paciente no está asignado al especialista',
      );
    }
  }

  private async assertUnique(correo: string, cedula: string) {
    const [byEmail, byIdentity] = await Promise.all([
      this.users.findByEmail(correo),
      this.users.findByCedula(cedula),
    ]);
    if (byEmail) throw new ConflictException('Correo duplicado');
    if (byIdentity) throw new ConflictException('Cédula duplicada');
  }

  private publicPatient(
    patient: NonNullable<
      Awaited<ReturnType<PatientRepositoryPort['findById']>>
    >,
    extras: Record<string, unknown> = {},
  ) {
    return {
      id: patient.id,
      usuario_id: patient.usuario.id,
      especialista_id: patient.especialista.id,
      xp_total: patient.xpTotal,
      nivel_actual: patient.nivelActual,
      umbral_bajo_rendimiento: patient.umbralBajoRendimiento,
      umbral_dias_inactividad: patient.umbralDiasInactividad,
      fecha_asignacion: patient.fechaAsignacion,
      nombre: patient.usuario.nombre,
      correo: patient.usuario.correo,
      cedula: patient.usuario.cedula,
      estado: patient.usuario.estado,
      fecha_nacimiento: patient.fechaNacimiento,
      edad: ageInBogota(patient.fechaNacimiento),
      ...(patient.especialista?.usuario
        ? { especialista_nombre: patient.especialista.usuario.nombre }
        : {}),
      ...extras,
    };
  }
}
