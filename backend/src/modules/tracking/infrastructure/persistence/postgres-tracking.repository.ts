import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ObservationEntity } from '../../domain/entities/observation.entity';
import { AlertEntity } from '../../domain/entities/alert.entity';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';
import type { NotificationPreferenceData } from '../../domain/ports/tracking.repository.port';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { SpecialistEntity } from '../../../users/domain/entities/specialist.entity';
import { ExerciseResultEntity } from '../../../therapy/domain/entities/exercise-result.entity';
import { AlertStatus, AlertType } from '../../domain/entities/alert.entity';
import { NotificationType } from '../../domain/entities/notification.entity';
import { DeviceTokenEntity } from '../../domain/entities/device-token.entity';
import type {
  AlertWithPatientName,
  TrackingRepositoryPort,
} from '../../domain/ports/tracking.repository.port';
@Injectable()
export class PostgresTrackingRepository implements TrackingRepositoryPort {
  constructor(
    @InjectRepository(ObservationEntity)
    private readonly obs: Repository<ObservationEntity>,
    @InjectRepository(AlertEntity)
    private readonly alert: Repository<AlertEntity>,
    @InjectRepository(NotificationEntity)
    private readonly note: Repository<NotificationEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private readonly pref: Repository<NotificationPreferenceEntity>,
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(SpecialistEntity)
    private readonly specialists: Repository<SpecialistEntity>,
    @InjectRepository(ExerciseResultEntity)
    private readonly results: Repository<ExerciseResultEntity>,
    @InjectRepository(DeviceTokenEntity)
    private readonly deviceTokensRepo: Repository<DeviceTokenEntity>,
  ) {}
  patientOwnedByUser(patientId: string, userId: string) {
    return this.patients.exists({
      where: { id: patientId, usuario: { id: userId } },
    });
  }
  async patientIdForUser(userId: string) {
    const patient = await this.patients.findOne({
      where: { usuario: { id: userId } },
      select: { id: true },
    });
    return patient?.id ?? null;
  }
  async specialistIdForUser(userId: string) {
    const specialist = await this.specialists.findOne({
      where: { usuario: { id: userId } },
      select: { id: true },
    });
    return specialist?.id ?? null;
  }
  patientAssignedToSpecialist(patientId: string, userId: string) {
    return this.patients.exists({
      where: { id: patientId, especialista: { usuario: { id: userId } } },
    });
  }
  observationOwnedBySpecialist(observationId: string, userId: string) {
    return this.obs.exists({
      where: { id: observationId, especialista: { usuario: { id: userId } } },
    });
  }
  notificationOwnedByPatient(notificationId: string, patientId: string) {
    return this.note.exists({
      where: { id: notificationId, paciente: { id: patientId } },
    });
  }
  async patientIdForNotification(notificationId: string) {
    const notification = await this.note.findOne({
      where: { id: notificationId },
      relations: { paciente: true },
    });
    return notification?.paciente.id ?? null;
  }
  async observations(id: string, page: number, limit: number) {
    const [data, total] = await this.obs.findAndCount({
      where: { paciente: { id } },
      order: { fecha: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { total, page, limit, data };
  }
  async createObservation(
    patientId: string,
    specialistId: string,
    texto: string,
  ) {
    const paciente = await this.patients.findOneByOrFail({ id: patientId });
    const especialista = await this.specialists.findOneOrFail({
      where: { usuario: { id: specialistId } },
    });
    return this.obs.save(this.obs.create({ paciente, especialista, texto }));
  }
  async updateObservation(id: string, texto: string) {
    await this.obs.update(id, { texto });
    return this.obs.findOneBy({ id });
  }
  async alerts(
    id?: string,
    filters?: any,
  ): Promise<AlertWithPatientName[]> {
    const query = this.alert
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.paciente', 'paciente')
      .leftJoin('paciente.usuario', 'pacienteUsuario')
      .addSelect('pacienteUsuario.nombre', 'paciente_nombre')
      .leftJoinAndSelect('paciente.especialista', 'especialista');
    if (id) query.andWhere('paciente.id = :patientId', { patientId: id });
    if (filters?.estado)
      query.andWhere('alert.estado = :status', { status: filters.estado });
    if (filters?.tipo)
      query.andWhere('alert.tipo = :type', { type: filters.tipo });
    if (filters?.especialistaId)
      query.andWhere('especialista.id = :specialistId', {
        specialistId: filters.especialistaId,
      });
    const { entities, raw } = await query
      .orderBy('alert.fechaGenerada', 'DESC')
      .getRawAndEntities<{ paciente_nombre: string }>();
    return entities.map((alert, index) =>
      Object.assign(alert, {
        pacienteNombre: raw[index].paciente_nombre,
      }),
    );
  }
  async notifications(
    id: string,
    leida: boolean | undefined,
    page: number,
    limit: number,
  ) {
    const [data, total] = await this.note.findAndCount({
      where: { paciente: { id }, ...(leida === undefined ? {} : { leida }) },
      order: { fechaEnvio: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { total, page, limit, data };
  }
  async markRead(id: string) {
    await this.note.update(id, { leida: true });
    return this.note.findOneBy({ id });
  }
  preference(id: string) {
    return this.pref.findOneBy({ pacienteId: id });
  }
  async savePreference(id: string, data: NotificationPreferenceData) {
    return this.pref.save(
      this.pref.create({ pacienteId: id, ...data }),
    ) as unknown as Promise<NotificationPreferenceEntity>;
  }
  patientsForMonitoring() {
    return this.patients.find({
      relations: { usuario: true, especialista: { usuario: true } },
    });
  }
  recentResults(patientId: string, limit: number) {
    return this.results.find({
      where: { paciente: { id: patientId } },
      order: { fecha: 'DESC' },
      take: limit,
    });
  }
  activeAlert(patientId: string, tipo: AlertType) {
    return this.alert.findOne({
      where: { paciente: { id: patientId }, tipo, estado: AlertStatus.ACTIVA },
    });
  }
  async createAlert(patientId: string, tipo: AlertType) {
    const patient = await this.patients.findOneByOrFail({ id: patientId });
    const alert = await this.activeAlert(patientId, tipo);
    if (alert) return alert;
    return this.alert.save(
      this.alert.create({
        paciente: patient,
        tipo,
        estado: AlertStatus.ACTIVA,
      }),
    );
  }
  async resolveAlerts(patientId: string, tipo: AlertType) {
    const active = await this.alert.find({
      where: { paciente: { id: patientId }, tipo, estado: AlertStatus.ACTIVA },
    });
    if (active.length > 0) {
      await this.alert.update(
        active.map((item) => item.id),
        { estado: AlertStatus.RESUELTA },
      );
    }
  }
  preferences() {
    return this.pref.find({ relations: { paciente: { usuario: true } } });
  }
  reminderSentSince(patientId: string, since: Date) {
    return this.note.exists({
      where: {
        paciente: { id: patientId },
        tipo: NotificationType.RECORDATORIO,
        fechaEnvio: MoreThanOrEqual(since),
      },
    });
  }
  async createNotification(
    patientId: string,
    tipo: NotificationType,
    mensaje: string,
  ) {
    const patient = await this.patients.findOneByOrFail({ id: patientId });
    return this.note.save(
      this.note.create({ paciente: patient, tipo, mensaje }),
    );
  }
  async registerDeviceToken(patientId: string, token: string) {
    const patient = await this.patients.findOneByOrFail({ id: patientId });
    return this.deviceTokensRepo.save(
      this.deviceTokensRepo.create({ paciente: patient, token }),
    );
  }
  deviceTokens(patientId: string) {
    return this.deviceTokensRepo.find({
      where: { paciente: { id: patientId } },
    });
  }
  async removeDeviceToken(token: string) {
    await this.deviceTokensRepo.delete({ token });
  }
}
