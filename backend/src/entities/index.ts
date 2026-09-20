export {
  UserEntity,
  UserRole,
} from '../modules/users/domain/entities/user.entity';
export { AdministratorEntity } from '../modules/users/domain/entities/administrator.entity';
export { SpecialistEntity } from '../modules/users/domain/entities/specialist.entity';
export { PatientEntity } from '../modules/users/domain/entities/patient.entity';
export {
  IncidentEntity,
  IncidentStatus,
} from '../modules/users/domain/entities/incident.entity';
export {
  ExerciseEntity,
  CognitiveCategory,
  ExerciseStatus,
} from '../modules/therapy/domain/entities/exercise.entity';
export {
  TherapeuticRouteEntity,
  RouteStatus,
} from '../modules/therapy/domain/entities/therapeutic-route.entity';
export {
  RouteExerciseEntity,
  RouteExerciseStatus,
} from '../modules/therapy/domain/entities/route-exercise.entity';
export { ExerciseResultEntity } from '../modules/therapy/domain/entities/exercise-result.entity';
export { BadgeEntity } from '../modules/gamification/domain/entities/badge.entity';
export { PatientBadgeEntity } from '../modules/gamification/domain/entities/patient-badge.entity';
export { ObservationEntity } from '../modules/tracking/domain/entities/observation.entity';
export {
  AlertEntity,
  AlertType,
  AlertStatus,
} from '../modules/tracking/domain/entities/alert.entity';
export {
  NotificationEntity,
  NotificationType,
} from '../modules/tracking/domain/entities/notification.entity';
export { NotificationPreferenceEntity } from '../modules/tracking/domain/entities/notification-preference.entity';

import { UserEntity } from '../modules/users/domain/entities/user.entity';
import { AdministratorEntity } from '../modules/users/domain/entities/administrator.entity';
import { SpecialistEntity } from '../modules/users/domain/entities/specialist.entity';
import { PatientEntity } from '../modules/users/domain/entities/patient.entity';
import { IncidentEntity } from '../modules/users/domain/entities/incident.entity';
import { ExerciseEntity } from '../modules/therapy/domain/entities/exercise.entity';
import { TherapeuticRouteEntity } from '../modules/therapy/domain/entities/therapeutic-route.entity';
import { RouteExerciseEntity } from '../modules/therapy/domain/entities/route-exercise.entity';
import { ExerciseResultEntity } from '../modules/therapy/domain/entities/exercise-result.entity';
import { BadgeEntity } from '../modules/gamification/domain/entities/badge.entity';
import { PatientBadgeEntity } from '../modules/gamification/domain/entities/patient-badge.entity';
import { ObservationEntity } from '../modules/tracking/domain/entities/observation.entity';
import { AlertEntity } from '../modules/tracking/domain/entities/alert.entity';
import { NotificationEntity } from '../modules/tracking/domain/entities/notification.entity';
import { NotificationPreferenceEntity } from '../modules/tracking/domain/entities/notification-preference.entity';
export const entities = [
  UserEntity,
  AdministratorEntity,
  SpecialistEntity,
  PatientEntity,
  IncidentEntity,
  ExerciseEntity,
  TherapeuticRouteEntity,
  RouteExerciseEntity,
  ExerciseResultEntity,
  BadgeEntity,
  PatientBadgeEntity,
  ObservationEntity,
  AlertEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
];
