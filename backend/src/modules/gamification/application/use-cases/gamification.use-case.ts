import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GAMIFICATION_REPOSITORY } from '../../domain/ports/gamification.repository.port';
import type { GamificationRepositoryPort } from '../../domain/ports/gamification.repository.port';
import { PatientBadgeEntity } from '../../domain/entities/patient-badge.entity';
import { NotificationType } from '../../../tracking/domain/entities/notification.entity';
import { PUSH_PORT } from '../../../tracking/domain/ports/push.port';
import type { PushPort } from '../../../tracking/domain/ports/push.port';
import { UserRole } from '../../../users/domain/entities/user.entity';

type Actor = { sub: string; rol: UserRole };

@Injectable()
export class GamificationUseCase {
  constructor(
    @Inject(GAMIFICATION_REPOSITORY)
    private readonly repository: GamificationRepositoryPort,
    @Inject(PUSH_PORT)
    private readonly push: PushPort,
  ) {}

  badges() {
    return this.repository
      .badges()
      .then((badges) => badges.map((badge) => this.badgeResponse(badge)));
  }

  async profile(patientId: string, actor: Actor) {
    const exists = await this.repository.patientExists(patientId);
    if (!exists) throw new NotFoundException('Paciente no encontrado');
    await this.assertPatientAccess(patientId, actor);
    const profile = await this.repository.profile(patientId);
    return {
      nivel_actual: profile.nivel_actual,
      xp_total: profile.xp_total,
      insignias: profile.insignias.map(
        (badge: {
          id: string;
          nombre: string;
          descripcion: string;
          condicion: string;
        }) => this.badgeResponse(badge),
      ),
    };
  }

  async patientBadges(patientId: string, actor: Actor) {
    const exists = await this.repository.patientExists(patientId);
    if (!exists) throw new NotFoundException('Paciente no encontrado');
    await this.assertPatientAccess(patientId, actor);
    const badges = await this.repository.patientBadges(patientId);
    return badges.map((badge) => ({
      paciente_id: badge.pacienteId,
      insignia_id: badge.insigniaId,
      fecha_obtenida: badge.fechaObtenida,
    }));
  }

  async unlocked(patientId: string, actor: Actor) {
    const exists = await this.repository.patientExists(patientId);
    if (!exists) throw new NotFoundException('Paciente no encontrado');
    await this.assertPatientAccess(patientId, actor);
    const exercises = await this.repository.unlocked(patientId);
    return exercises.map((exercise) => ({
      id: exercise.id,
      nombre: exercise.nombre,
      categoria: exercise.categoria,
      tipo: exercise.tipo,
      nivel_dificultad: exercise.nivelDificultad,
      instrucciones: exercise.instrucciones,
      parametros: exercise.parametros,
      estado: exercise.estado,
      especialista_id: exercise.especialista?.id,
      fecha_creacion: exercise.fechaCreacion,
    }));
  }

  async onExerciseCompleted(
    patientId: string,
    previousLevel: number,
  ): Promise<PatientBadgeEntity[]> {
    const metrics = await this.repository.metrics(patientId);
    if (metrics.nivel > previousLevel) {
      await this.repository.createNotification(
        patientId,
        NotificationType.SUBIDA_NIVEL,
        `¡Felicitaciones! Alcanzaste el nivel ${metrics.nivel}.`,
      );
      await this.push.sendToPatient(
        patientId,
        '¡Subiste de nivel!',
        `Alcanzaste el nivel ${metrics.nivel}.`,
      );
    }
    const catalog = await this.repository.badges();
    const earned: PatientBadgeEntity[] = [];
    for (const badge of catalog) {
      if (!this.conditionIsMet(badge.condicion, metrics)) continue;
      const awarded = await this.repository.awardBadge(patientId, badge.id);
      if (awarded) {
        earned.push(awarded);
        await this.repository.createNotification(
          patientId,
          NotificationType.INSIGNIA_OBTENIDA,
          `Obtuviste la insignia ${awarded.insignia.nombre}.`,
        );
        await this.push.sendToPatient(
          patientId,
          'Insignia obtenida',
          `Obtuviste la insignia ${awarded.insignia.nombre}.`,
        );
      }
    }
    return earned;
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
    if (!allowed) {
      throw new ForbiddenException('No tienes acceso a este paciente');
    }
  }

  private conditionIsMet(condition: string, metrics: Record<string, number>) {
    const match =
      /^\s*(sesiones|puntaje_promedio|aciertos|nivel|xp|mejor_puntaje)\s*(>=|<=|==|>|<)\s*(\d+(?:\.\d+)?)\s*$/i.exec(
        condition,
      );
    if (!match) return false;
    const [, key, operator, rawThreshold] = match;
    const metricKey = key.toLowerCase();
    const metric = metrics[metricKey];
    if (metric === undefined) return false;
    const threshold = Number(rawThreshold);
    switch (operator) {
      case '>':
        return metric > threshold;
      case '>=':
        return metric >= threshold;
      case '<':
        return metric < threshold;
      case '<=':
        return metric <= threshold;
      case '==':
        return metric === threshold;
      default:
        return false;
    }
  }

  private badgeResponse(badge: {
    id: string;
    nombre: string;
    descripcion: string;
    condicion: string;
  }) {
    return {
      id: badge.id,
      nombre: badge.nombre,
      descripcion: badge.descripcion,
      condicion: badge.condicion,
    };
  }
}
