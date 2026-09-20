import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObservationEntity } from '../../domain/entities/observation.entity';
import { AlertEntity } from '../../domain/entities/alert.entity';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { SpecialistEntity } from '../../../users/domain/entities/specialist.entity';
import type { TrackingRepositoryPort } from '../../domain/ports/tracking.repository.port';
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
  ) {}
  observations(id: string) {
    return this.obs.find({
      where: { paciente: { id } },
      order: { fecha: 'DESC' },
    });
  }
  async createObservation(
    patientId: string,
    specialistId: string,
    texto: string,
  ) {
    const paciente = await this.patients.findOneByOrFail({ id: patientId });
    const especialista = await this.specialists.findOneByOrFail({
      id: specialistId,
    });
    return this.obs.save(this.obs.create({ paciente, especialista, texto }));
  }
  async updateObservation(id: string, texto: string) {
    await this.obs.update(id, { texto });
    return this.obs.findOneBy({ id });
  }
  alerts(id?: string, filters?: any) {
    const query = this.alert
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.paciente', 'paciente')
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
    return query.orderBy('alert.fechaGenerada', 'DESC').getMany();
  }
  notifications(id: string, leida?: boolean) {
    return this.note.find({
      where: { paciente: { id }, ...(leida === undefined ? {} : { leida }) },
      order: { fechaEnvio: 'DESC' },
    });
  }
  async markRead(id: string) {
    await this.note.update(id, { leida: true });
    return this.note.findOneBy({ id });
  }
  preference(id: string) {
    return this.pref.findOneBy({ pacienteId: id });
  }
  async savePreference(id: string, data: any) {
    return this.pref.save(
      this.pref.create({ pacienteId: id, ...data }),
    ) as unknown as Promise<NotificationPreferenceEntity>;
  }
}
