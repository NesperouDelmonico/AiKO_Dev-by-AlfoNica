import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TRACKING_REPOSITORY } from '../../domain/ports/tracking.repository.port';
import type { TrackingRepositoryPort } from '../../domain/ports/tracking.repository.port';
import { UserRole } from '../../../users/domain/entities/user.entity';
import type {
  AlertQueryDto,
  NotificationQueryDto,
  ObservationDto,
  PreferenceDto,
} from '../dto/tracking.dto';
import type { RegisterDeviceTokenDto } from '../dto/device-token.dto';

type Actor = { sub: string; rol: UserRole };

@Injectable()
export class TrackingUseCase {
  constructor(
    @Inject(TRACKING_REPOSITORY)
    private readonly repository: TrackingRepositoryPort,
  ) {}

  async observations(
    patientId: string,
    page: number,
    limit: number,
    actor: Actor,
  ) {
    await this.assertPatientAccess(patientId, actor);
    return this.repository.observations(patientId, page, limit);
  }

  async createObservation(
    patientId: string,
    specialistUserId: string,
    data: ObservationDto,
  ) {
    const assigned = await this.repository.patientAssignedToSpecialist(
      patientId,
      specialistUserId,
    );
    if (!assigned)
      throw new ForbiddenException('Paciente no asignado al especialista');
    return this.repository.createObservation(
      patientId,
      specialistUserId,
      data.texto,
    );
  }

  async updateObservation(id: string, data: ObservationDto, actor: Actor) {
    if (actor.rol !== UserRole.ADMINISTRADOR) {
      const owns = await this.repository.observationOwnedBySpecialist(
        id,
        actor.sub,
      );
      if (!owns) throw new NotFoundException('Observación no encontrada');
    }
    const observation = await this.repository.updateObservation(id, data.texto);
    if (!observation) throw new NotFoundException('Observación no encontrada');
    return observation;
  }

  async alerts(
    patientId: string | undefined,
    query: AlertQueryDto,
    actor: Actor,
  ) {
    const filters: Record<string, unknown> = {
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
    };
    if (patientId) await this.assertPatientAccess(patientId, actor);
    if (actor.rol === UserRole.ESPECIALISTA) {
      const specialistId = await this.repository.specialistIdForUser(actor.sub);
      if (!specialistId)
        throw new ForbiddenException('Se requiere una cuenta especialista');
      if (query.especialista_id && query.especialista_id !== specialistId) {
        throw new ForbiddenException(
          'No puedes consultar alertas de otro especialista',
        );
      }
      filters.especialistaId = specialistId;
    } else if (query.especialista_id) {
      filters.especialistaId = query.especialista_id;
    }
    const alerts = await this.repository.alerts(patientId, filters);
    return alerts.map(({ pacienteNombre, ...alert }) => ({
      ...alert,
      paciente_id: alert.paciente.id,
      paciente_nombre: pacienteNombre,
    }));
  }

  async notifications(
    patientId: string,
    query: NotificationQueryDto,
    actor: Actor,
  ) {
    await this.assertPatientAccess(patientId, actor);
    return this.repository.notifications(
      patientId,
      query.leida,
      query.page,
      query.limit,
    );
  }

  async markRead(id: string, actor: Actor) {
    const patientId = await this.repository.patientIdForNotification(id);
    if (!patientId) throw new NotFoundException('Notificación no encontrada');
    await this.assertPatientAccess(patientId, actor);
    const notification = await this.repository.markRead(id);
    if (!notification)
      throw new NotFoundException('Notificación no encontrada');
    return notification;
  }

  async preference(patientId: string, actor: Actor) {
    await this.assertPatientAccess(patientId, actor);
    const preference = await this.repository.preference(patientId);
    if (!preference)
      throw new NotFoundException('Preferencia de notificación no encontrada');
    return preference;
  }

  async savePreference(patientId: string, data: PreferenceDto, actor: Actor) {
    await this.assertPatientAccess(patientId, actor);
    const normalizedTime = data.horario_recordatorio
      ? data.horario_recordatorio.length === 5
        ? `${data.horario_recordatorio}:00`
        : data.horario_recordatorio
      : data.horario_recordatorio;
    return this.repository.savePreference(patientId, {
      frecuencia: data.frecuencia,
      horarioRecordatorio: normalizedTime,
    });
  }

  async registerDevice(
    patientId: string,
    data: RegisterDeviceTokenDto,
    actor: Actor,
  ) {
    await this.assertPatientAccess(patientId, actor);
    await this.repository.registerDeviceToken(patientId, data.token);
    return { registrado: true };
  }

  private async assertPatientAccess(patientId: string, actor: Actor) {
    if (actor.rol === UserRole.ADMINISTRADOR) return;
    const allowed =
      actor.rol === UserRole.PACIENTE
        ? await this.repository.patientOwnedByUser(patientId, actor.sub)
        : actor.rol === UserRole.ESPECIALISTA
          ? await this.repository.patientAssignedToSpecialist(
              patientId,
              actor.sub,
            )
          : false;
    if (!allowed)
      throw new ForbiddenException('No tienes acceso a este paciente');
  }
}
