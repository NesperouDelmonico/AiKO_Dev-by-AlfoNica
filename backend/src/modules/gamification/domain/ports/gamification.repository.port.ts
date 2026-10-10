import { BadgeEntity } from '../entities/badge.entity';
import { PatientBadgeEntity } from '../entities/patient-badge.entity';
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
  createNotification(
    patientId: string,
    type: NotificationType,
    message: string,
  ): Promise<NotificationEntity>;
}
