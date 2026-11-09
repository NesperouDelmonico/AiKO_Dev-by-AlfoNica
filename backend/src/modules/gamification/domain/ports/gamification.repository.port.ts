import { BadgeEntity } from '../entities/badge.entity';
import { PatientBadgeEntity } from '../entities/patient-badge.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import {
  NotificationEntity,
  NotificationType,
} from '../../../tracking/domain/entities/notification.entity';
export const GAMIFICATION_REPOSITORY = Symbol('GAMIFICATION_REPOSITORY');
export interface GamificationRepositoryPort {
  patientExists(id: string): Promise<boolean>;
  patientOwnedByUser(patientId: string, userId: string): Promise<boolean>;
  patientAssignedToSpecialist(
    patientId: string,
    specialistUserId: string,
  ): Promise<boolean>;
  badges(): Promise<BadgeEntity[]>;
  profile(id: string): Promise<any>;
  patientBadges(id: string): Promise<PatientBadgeEntity[]>;
  unlocked(id: string): Promise<any[]>;
  metrics(id: string): Promise<Record<string, number>>;
  awardBadge(
    patientId: string,
    badgeId: string,
  ): Promise<PatientBadgeEntity | null>;
  /** Monedero del paciente (monedas, accesorios, potenciadores). */
  wallet(patientId: string): Promise<PatientEntity | null>;
  /**
   * Modifica el monedero dentro de una transacción con bloqueo. Si [change]
   * lanza un error, no se guarda nada.
   */
  updateWallet(
    patientId: string,
    change: (patient: PatientEntity) => void,
  ): Promise<PatientEntity>;
  createNotification(
    patientId: string,
    type: NotificationType,
    message: string,
  ): Promise<NotificationEntity>;
}
