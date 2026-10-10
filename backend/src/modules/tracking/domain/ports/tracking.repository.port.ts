import { ObservationEntity } from '../entities/observation.entity';
import { AlertEntity, AlertStatus, AlertType } from '../entities/alert.entity';
import {
  NotificationEntity,
  NotificationType,
} from '../entities/notification.entity';
import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';
import { ReminderFrequency } from '../entities/notification-preference.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { ExerciseResultEntity } from '../../../therapy/domain/entities/exercise-result.entity';
import { DeviceTokenEntity } from '../entities/device-token.entity';
export const TRACKING_REPOSITORY = Symbol('TRACKING_REPOSITORY');
export type NotificationPreferenceData = {
  frecuencia: ReminderFrequency;
  horarioRecordatorio: string;
};

export interface TrackingRepositoryPort {
  patientOwnedByUser(patientId: string, userId: string): Promise<boolean>;
  patientIdForUser(userId: string): Promise<string | null>;
  specialistIdForUser(userId: string): Promise<string | null>;
  patientAssignedToSpecialist(
    patientId: string,
    userId: string,
  ): Promise<boolean>;
  observationOwnedBySpecialist(
    observationId: string,
    userId: string,
  ): Promise<boolean>;
  notificationOwnedByPatient(
    notificationId: string,
    patientId: string,
  ): Promise<boolean>;
  patientIdForNotification(notificationId: string): Promise<string | null>;
  observations(
    id: string,
    page: number,
    limit: number,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: ObservationEntity[];
  }>;
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
  notifications(
    id: string,
    leida: boolean | undefined,
    page: number,
    limit: number,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: NotificationEntity[];
  }>;
  markRead(id: string): Promise<NotificationEntity | null>;
  preference(id: string): Promise<NotificationPreferenceEntity | null>;
  savePreference(
    id: string,
    data: NotificationPreferenceData,
  ): Promise<NotificationPreferenceEntity>;
  patientsForMonitoring(): Promise<PatientEntity[]>;
  recentResults(
    patientId: string,
    limit: number,
  ): Promise<ExerciseResultEntity[]>;
  activeAlert(patientId: string, tipo: AlertType): Promise<AlertEntity | null>;
  createAlert(patientId: string, tipo: AlertType): Promise<AlertEntity>;
  resolveAlerts(patientId: string, tipo: AlertType): Promise<void>;
  preferences(): Promise<NotificationPreferenceEntity[]>;
  reminderSentSince(patientId: string, since: Date): Promise<boolean>;
  createNotification(
    patientId: string,
    tipo: NotificationType,
    mensaje: string,
  ): Promise<NotificationEntity>;
  registerDeviceToken(
    patientId: string,
    token: string,
  ): Promise<DeviceTokenEntity>;
  deviceTokens(patientId: string): Promise<DeviceTokenEntity[]>;
  removeDeviceToken(token: string): Promise<void>;
}
