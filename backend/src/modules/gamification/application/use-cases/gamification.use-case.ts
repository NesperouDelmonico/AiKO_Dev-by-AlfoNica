import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isAccessory,
  MAX_STREAK_SAVERS,
  SHOP,
  shopItem,
  XP_BOOST_EXERCISES,
} from '../../domain/services/economy';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
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

  /** Catálogo de la tienda. */
  shop() {
    return SHOP.map((item) => ({ ...item }));
  }

  async wallet(patientId: string, actor: Actor) {
    await this.assertPatientExists(patientId);
    await this.assertPatientAccess(patientId, actor);
    const patient = await this.repository.wallet(patientId);
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return this.walletResponse(patient);
  }

  /** Compra con monedas (solo el propio paciente). */
  async purchase(patientId: string, itemId: string, actor: Actor) {
    await this.assertOwnPatient(patientId, actor);
    const item = shopItem(itemId);
    if (!item) throw new NotFoundException('Artículo no encontrado');
    const patient = await this.repository.updateWallet(patientId, (p) => {
      if (item.tipo === 'accesorio' && (p.accesorios ?? []).includes(item.id)) {
        throw new ConflictException('Ya tienes este accesorio');
      }
      if (item.tipo === 'salvador' && p.salvadoresRacha >= MAX_STREAK_SAVERS) {
        throw new ConflictException(
          `Ya tienes el máximo de salvadores de racha (${MAX_STREAK_SAVERS})`,
        );
      }
      if (p.monedas < item.precio) {
        throw new BadRequestException(
          `Te faltan ${item.precio - p.monedas} monedas`,
        );
      }
      p.monedas -= item.precio;
      if (item.tipo === 'accesorio') {
        p.accesorios = [...new Set([...(p.accesorios ?? ['base']), item.id])];
        p.accesorio = item.id;
      } else if (item.tipo === 'potenciador') {
        p.potenciadorXpRestante += XP_BOOST_EXERCISES;
      } else {
        p.salvadoresRacha += 1;
      }
    });
    return this.walletResponse(patient);
  }

  /** Ponerle al osito un accesorio comprado (solo el propio paciente). */
  async equip(patientId: string, accessory: string, actor: Actor) {
    await this.assertOwnPatient(patientId, actor);
    if (!isAccessory(accessory)) {
      throw new BadRequestException('Ese accesorio no existe');
    }
    const patient = await this.repository.updateWallet(patientId, (p) => {
      if (accessory !== 'base' && !(p.accesorios ?? []).includes(accessory)) {
        throw new ForbiddenException('Primero compra este accesorio');
      }
      p.accesorio = accessory;
    });
    return this.walletResponse(patient);
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

  private async assertPatientExists(patientId: string) {
    if (!(await this.repository.patientExists(patientId))) {
      throw new NotFoundException('Paciente no encontrado');
    }
  }

  private async assertOwnPatient(patientId: string, actor: Actor) {
    await this.assertPatientExists(patientId);
    const own =
      actor.rol === UserRole.PACIENTE &&
      (await this.repository.patientOwnedByUser(patientId, actor.sub));
    if (!own) {
      throw new ForbiddenException('Solo el paciente puede usar su tienda');
    }
  }

  private walletResponse(patient: PatientEntity) {
    const owned = [...new Set(['base', ...(patient.accesorios ?? [])])];
    return {
      monedas: patient.monedas ?? 0,
      accesorio: isAccessory(patient.accesorio) ? patient.accesorio : 'base',
      accesorios: owned,
      potenciador_xp_restante: patient.potenciadorXpRestante ?? 0,
      salvadores_racha: patient.salvadoresRacha ?? 0,
      dias_protegidos: patient.diasProtegidos ?? [],
    };
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
