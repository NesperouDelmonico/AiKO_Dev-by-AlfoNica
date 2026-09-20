import { ObservationEntity } from '../entities/observation.entity';
import { AlertEntity, AlertStatus, AlertType } from '../entities/alert.entity';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';
export const TRACKING_REPOSITORY = Symbol('TRACKING_REPOSITORY');
export interface TrackingRepositoryPort {
  observations(id: string): Promise<ObservationEntity[]>;
  createObservation(
    patientId: string,
    specialistId: string,
    texto: string,
  ): Promise<ObservationEntity>;
  updateObservation(
    id: string,
    texto: string,
  ): Promise<ObservationEntity | null>;
  alerts(id?: string, filters?: any): Promise<AlertEntity[]>;
  notifications(id: string, leida?: boolean): Promise<NotificationEntity[]>;
  markRead(id: string): Promise<NotificationEntity | null>;
  preference(id: string): Promise<NotificationPreferenceEntity | null>;
  savePreference(id: string, data: any): Promise<NotificationPreferenceEntity>;
}
