import { BadgeEntity } from '../entities/badge.entity';
import { PatientBadgeEntity } from '../entities/patient-badge.entity';
export const GAMIFICATION_REPOSITORY = Symbol('GAMIFICATION_REPOSITORY');
export interface GamificationRepositoryPort {
  badges(): Promise<BadgeEntity[]>;
  profile(id: string): Promise<any>;
  patientBadges(id: string): Promise<PatientBadgeEntity[]>;
  unlocked(id: string): Promise<any[]>;
}
