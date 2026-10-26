import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_GAME_TYPE,
  ExerciseEntity,
  ExerciseStatus,
  GameType,
} from '../../domain/entities/exercise.entity';
import { IMAGE_STORAGE } from '../../domain/ports/image-storage.port';
import type { ImageStoragePort } from '../../domain/ports/image-storage.port';
import { routeSchedule } from '../../domain/services/route-schedule';
import { normalizeExerciseParameters } from '../../domain/services/exercise-parameters';
import { RouteExerciseStatus } from '../../domain/entities/route-exercise.entity';
import { RouteExerciseEntity } from '../../domain/entities/route-exercise.entity';
import { ExerciseResultEntity } from '../../domain/entities/exercise-result.entity';
import { TherapeuticRouteEntity } from '../../domain/entities/therapeutic-route.entity';
import { RouteStatus } from '../../domain/entities/therapeutic-route.entity';
import { THERAPY_REPOSITORY } from '../../domain/ports/therapy.repository.port';
import type { TherapyRepositoryPort } from '../../domain/ports/therapy.repository.port';
import { UserRole } from '../../../users/domain/entities/user.entity';
import { GamificationUseCase } from '../../../gamification/application/use-cases/gamification.use-case';
import type {
  AddRouteExerciseDto,
  CreateExerciseDto,
  ExerciseQueryDto,
  ExerciseStatusDto,
  ResultDto,
  UpdateExerciseDto,
} from '../dto/therapy.dto';

type Actor = { sub: string; rol: UserRole };

type RouteItemInput = { ejercicioId: string; orden: number; dia?: number };

@Injectable()
export class TherapyUseCase {
  private readonly logger = new Logger(TherapyUseCase.name);

  constructor(
    @Inject(THERAPY_REPOSITORY)
    private readonly repository: TherapyRepositoryPort,
    private readonly config: ConfigService,
    private readonly gamification: GamificationUseCase,
    @Optional()
    @Inject(IMAGE_STORAGE)
    private readonly images?: ImageStoragePort,
  ) {}

  async list(query: ExerciseQueryDto, actor: Actor) {
    const filters = {
      categoria: query.categoria,
      nivelDificultad: query.nivel_dificultad,
      estado: query.estado,
    };
    if (actor.rol !== UserRole.PACIENTE) {
      // Cada especialista ve solo su catálogo; el administrador ve todos.
      return (
        await this.repository.exercises({
          ...filters,
          archivados: query.archivados ?? false,
          ...(actor.rol === UserRole.ADMINISTRADOR
            ? {}
            : { especialistaUserId: actor.sub }),
        })
      ).map((exercise) => this.exerciseResponse(exercise));
    }
    const patient = await this.repository.patientForUser(actor.sub);
    if (!patient)
      throw new ForbiddenException('La cuenta no tiene perfil de paciente');
    const exercises = await this.repository.exercises({
      ...filters,
      estado: ExerciseStatus.ACTIVO,
    });
    const available = await Promise.all(
      exercises.map((exercise) =>
        this.repository.exerciseAvailableForPatient(patient.id, exercise.id),
      ),
    );
    return exercises
      .filter((_, index) => available[index])
      .map((exercise) => this.exerciseResponse(exercise));
  }

  /** Valida los parámetros del tipo de juego y que sus imágenes existan. */
  private async parameters(
    tipo: GameType,
    parametros: Record<string, unknown>,
  ) {
    const check = normalizeExerciseParameters(tipo, parametros);
    if (!check.ok) throw new BadRequestException(check.errores);
    const missing = (await this.images?.missing(check.imagenes)) ?? [];
    if (missing.length) {
      throw new BadRequestException(
        `Imágenes no encontradas: ${missing.join(', ')}. Súbelas de nuevo.`,
      );
    }
    return check.parametros;
  }

  async create(data: CreateExerciseDto, specialistUserId: string) {
    const tipo = data.tipo ?? DEFAULT_GAME_TYPE[data.categoria];
    const exercise = await this.repository.saveExercise(
      {
        nombre: data.nombre,
        categoria: data.categoria,
        tipo,
        nivelDificultad: data.nivel_dificultad,
        instrucciones: data.instrucciones,
        parametros: await this.parameters(tipo, data.parametros),
        estado: ExerciseStatus.ACTIVO,
      },
      specialistUserId,
    );
    return this.exerciseResponse(exercise);
  }

  async get(id: string) {
    const exercise = await this.repository.exercise(id);
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    return this.exerciseResponse(exercise);
  }

  /**
   * Detalle visible para quien consulta: el administrador ve todo; el
   * especialista, sus ejercicios y los que ya están en rutas de sus
   * pacientes; el paciente, los de sus rutas. Lo demás responde 404.
   */
  async getFor(id: string, actor: Actor) {
    const exercise = await this.get(id);
    if (actor.rol === UserRole.ADMINISTRADOR) return exercise;
    if (actor.rol === UserRole.ESPECIALISTA) {
      if (
        (await this.repository.exerciseOwnedBySpecialist(id, actor.sub)) ||
        (await this.repository.exerciseUsedInRoutes(id, {
          especialistaUserId: actor.sub,
        }))
      ) {
        return exercise;
      }
    } else if (actor.rol === UserRole.PACIENTE) {
      const patient = await this.repository.patientForUser(actor.sub);
      if (
        patient &&
        (await this.repository.exerciseUsedInRoutes(id, {
          pacienteId: patient.id,
        }))
      ) {
        return exercise;
      }
    }
    throw new NotFoundException('Ejercicio no encontrado');
  }

  /** Archiva (true) o restaura (false) un ejercicio propio. */
  async archive(id: string, archived: boolean, actor: Actor) {
    const exercise = await this.get(id);
    await this.assertExerciseOwner(exercise.id, actor);
    if (Boolean(exercise.archivado_en) === archived) return exercise;
    const updated = await this.repository.updateExercise(id, {
      archivadoEn: archived ? new Date() : null,
    });
    if (!updated) throw new NotFoundException('Ejercicio no encontrado');
    return this.exerciseResponse(updated);
  }

  async update(id: string, data: UpdateExerciseDto, actor: Actor) {
    const exercise = await this.get(id);
    await this.assertExerciseOwner(exercise.id, actor);
    if (await this.repository.activeUsage(id)) {
      throw new ConflictException('Ejercicio en uso activo');
    }
    const tipo = data.tipo ?? exercise.tipo;
    const parametros =
      data.parametros === undefined && data.tipo === undefined
        ? undefined
        : await this.parameters(tipo, data.parametros ?? exercise.parametros);
    const updated = await this.repository.updateExercise(id, {
      ...(data.nombre === undefined ? {} : { nombre: data.nombre }),
      ...(data.categoria === undefined ? {} : { categoria: data.categoria }),
      ...(data.tipo === undefined ? {} : { tipo: data.tipo }),
      ...(data.nivel_dificultad === undefined
        ? {}
        : { nivelDificultad: data.nivel_dificultad }),
      ...(data.instrucciones === undefined
        ? {}
        : { instrucciones: data.instrucciones }),
      ...(parametros === undefined ? {} : { parametros }),
    });
    if (!updated) throw new NotFoundException('Ejercicio no encontrado');
    return this.exerciseResponse(updated);
  }

  async status(id: string, data: ExerciseStatusDto, actor: Actor) {
    const exercise = await this.get(id);
    await this.assertExerciseOwner(exercise.id, actor);
    const updated = await this.repository.updateExercise(id, {
      estado: data.estado,
    });
    if (!updated) throw new NotFoundException('Ejercicio no encontrado');
    return this.exerciseResponse(updated);
  }

  async execute(id: string, patientUserId: string) {
    const exercise = await this.get(id);
    const patient = await this.repository.patientForUser(patientUserId);
    if (
      !patient ||
      !(await this.repository.exerciseAvailableForPatient(patient.id, id))
    ) {
      throw new ForbiddenException(
        'Ejercicio bloqueado por nivel o ruta activa',
      );
    }
    if (exercise.estado !== ExerciseStatus.ACTIVO) {
      throw new ForbiddenException('Ejercicio desactivado');
    }
    return {
      sesion_id: randomUUID(),
      ejercicio: exercise,
    };
  }

  async route(
    patientId: string,
    items: RouteItemInput[],
    specialistUserId: string,
    duracionDias?: number,
  ) {
    const assigned = await this.repository.patientAssignedToSpecialist(
      patientId,
      specialistUserId,
    );
    if (!assigned)
      throw new ForbiddenException('Paciente no asignado al especialista');
    if (
      !items.length ||
      items.some((item, index) => item.orden !== index + 1)
    ) {
      throw new BadRequestException(
        'Los ejercicios deben tener orden secuencial desde 1',
      );
    }
    const days = items.map((item) => item.dia ?? 1);
    if (
      days[0] !== 1 ||
      days.some(
        (day, index) =>
          index > 0 && (day < days[index - 1] || day > days[index - 1] + 1),
      )
    ) {
      throw new BadRequestException(
        'Los días deben empezar en 1 y avanzar de a uno según el orden',
      );
    }
    const lastDay = days[days.length - 1];
    if (duracionDias !== undefined && lastDay !== duracionDias) {
      throw new BadRequestException(
        `El plan es de ${duracionDias} día(s): cada día debe tener al menos un ejercicio (hay ${lastDay})`,
      );
    }
    // Un ejercicio puede repetirse en la ruta (p. ej. el mismo juego en
    // varios días); cada paso es un ruta_ejercicio distinto.
    const patient = await this.repository.patientById(patientId);
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    // Un mes puede tener cientos de pasos: se consulta cada ejercicio una vez.
    const specialistId =
      await this.repository.specialistIdForUser(specialistUserId);
    for (const ejercicioId of new Set(items.map((item) => item.ejercicioId))) {
      const exercise = await this.repository.exercise(ejercicioId);
      if (!exercise || exercise.estado !== ExerciseStatus.ACTIVO) {
        throw new BadRequestException(
          'Todos los ejercicios deben existir y estar activos',
        );
      }
      this.assertUsableInNewStep(exercise, specialistId);
      if (exercise.nivelDificultad > patient.nivelActual) {
        throw new BadRequestException(
          'La ruta contiene ejercicios de nivel bloqueado',
        );
      }
    }
    try {
      const route = await this.repository.createRoute(
        patientId,
        items.map((item, index) => ({ ...item, dia: days[index] })),
        duracionDias ?? lastDay,
      );
      return this.routeResponse(route);
    } catch (error) {
      if (error instanceof Error && error.message === 'ACTIVE_ROUTE_CONFLICT') {
        throw new ConflictException('Ya existe una ruta activa');
      }
      if (
        error instanceof Error &&
        error.message === 'ROUTE_EXERCISE_NOT_AVAILABLE'
      ) {
        throw new BadRequestException(
          'Uno o más ejercicios dejaron de estar activos',
        );
      }
      throw error;
    }
  }

  async activeRoute(patientId: string, actor: Actor) {
    await this.assertPatientAccess(patientId, actor);
    const route = await this.repository.activeRoute(patientId);
    if (!route) throw new NotFoundException('Sin ruta activa');
    const progress = await this.repository.progress(route.id);
    const schedule = routeSchedule(route.ejercicios ?? []);
    return {
      ...this.routeResponse(route),
      agenda: { ...schedule, duracion_dias: route.duracionDias ?? null },
      ejercicios: (route.ejercicios ?? []).map((item) =>
        this.routeExerciseResponse(item, route.id),
      ),
      progreso: progress,
    };
  }

  async progress(routeId: string, actor: Actor) {
    if (!(await this.repository.routeExists(routeId))) {
      throw new NotFoundException('Ruta no encontrada');
    }
    const patientId = await this.repository.routePatientId(routeId);
    if (!patientId) throw new NotFoundException('Ruta no encontrada');
    await this.assertPatientAccess(patientId, actor);
    return this.repository.progress(routeId);
  }

  async add(routeId: string, data: AddRouteExerciseDto, actor: Actor) {
    const patientId = await this.requireActiveRouteAccess(routeId, actor);
    const count = await this.repository.routeExerciseCount(routeId);
    if (data.orden !== count + 1) {
      throw new BadRequestException(
        'El ejercicio debe agregarse al final de la secuencia',
      );
    }
    const patient = await this.repository.patientById(patientId);
    const exercise = await this.repository.exercise(data.ejercicio_id);
    if (!exercise || exercise.estado !== ExerciseStatus.ACTIVO) {
      throw new NotFoundException('Ejercicio activo no encontrado');
    }
    await this.assertUsableBy(exercise, actor);
    if (!patient || exercise.nivelDificultad > patient.nivelActual) {
      throw new ForbiddenException('Ejercicio bloqueado por nivel');
    }
    try {
      const item = await this.repository.addRouteExercise(
        routeId,
        data.ejercicio_id,
        data.orden,
        data.dia,
      );
      return this.routeExerciseResponse(item, routeId);
    } catch (error) {
      if (error instanceof Error && error.message === 'ROUTE_ORDER_INVALID') {
        throw new BadRequestException(
          'El ejercicio debe agregarse al final de la secuencia',
        );
      }
      if (error instanceof Error && error.message === 'ROUTE_DAY_INVALID') {
        throw new BadRequestException(
          'El día debe ser el último de la ruta o el siguiente',
        );
      }
      if (error instanceof Error && error.message === 'ROUTE_NOT_ACTIVE') {
        throw new ConflictException('La ruta no está activa');
      }
      throw error;
    }
  }

  async remove(routeId: string, routeExerciseId: string, actor: Actor) {
    await this.requireActiveRouteAccess(routeId, actor);
    const item = await this.repository.routeExerciseInRoute(
      routeId,
      routeExerciseId,
    );
    if (!item) throw new NotFoundException('Ejercicio de ruta no encontrado');
    if (item.estado === RouteExerciseStatus.COMPLETADO) {
      throw new ConflictException('Ejercicio ya completado');
    }
    try {
      await this.repository.removeRouteExercise(routeExerciseId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'ROUTE_EXERCISE_NOT_FOUND'
      ) {
        throw new NotFoundException('Ejercicio de ruta no encontrado');
      }
      if (
        error instanceof Error &&
        error.message === 'ROUTE_EXERCISE_ALREADY_COMPLETED'
      ) {
        throw new ConflictException('Ejercicio ya completado');
      }
      if (error instanceof Error && error.message === 'ROUTE_NOT_ACTIVE') {
        throw new ConflictException('La ruta no está activa');
      }
      throw error;
    }
  }

  async replace(
    routeId: string,
    routeExerciseId: string,
    exerciseId: string,
    actor: Actor,
  ) {
    const patientId = await this.requireActiveRouteAccess(routeId, actor);
    const item = await this.repository.routeExerciseInRoute(
      routeId,
      routeExerciseId,
    );
    if (!item) throw new NotFoundException('Ejercicio de ruta no encontrado');
    if (item.estado === RouteExerciseStatus.COMPLETADO) {
      throw new ConflictException('Ejercicio ya completado');
    }
    const replacement = await this.repository.exercise(exerciseId);
    const patient = await this.repository.patientById(patientId);
    if (!replacement || replacement.estado !== ExerciseStatus.ACTIVO) {
      throw new NotFoundException('Ejercicio activo no encontrado');
    }
    await this.assertUsableBy(replacement, actor);
    if (!patient || replacement.nivelDificultad > patient.nivelActual) {
      throw new ForbiddenException('Ejercicio bloqueado por nivel');
    }
    let updated;
    try {
      updated = await this.repository.replaceRouteExercise(
        routeExerciseId,
        exerciseId,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'ROUTE_EXERCISE_ALREADY_COMPLETED'
      ) {
        throw new ConflictException('Ejercicio ya completado');
      }
      if (error instanceof Error && error.message === 'ROUTE_NOT_ACTIVE') {
        throw new ConflictException('La ruta no está activa');
      }
      throw error;
    }
    if (!updated)
      throw new NotFoundException('Ejercicio de ruta no encontrado');
    return this.routeExerciseResponse(updated, routeId);
  }

  async result(
    routeId: string,
    routeExerciseId: string,
    data: ResultDto,
    patientUserId: string,
  ) {
    const patient = await this.repository.patientForUser(patientUserId);
    if (!patient)
      throw new ForbiddenException('La cuenta no tiene perfil de paciente');
    const item = await this.repository.routeExerciseInRoute(
      routeId,
      routeExerciseId,
    );
    if (!item) throw new NotFoundException('Ejercicio de ruta no encontrado');
    if (item.ruta.paciente.id !== patient.id) {
      throw new ForbiddenException(
        'La ruta no pertenece al paciente autenticado',
      );
    }
    if (
      item.ruta.estado !== RouteStatus.ACTIVA ||
      item.estado !== RouteExerciseStatus.PENDIENTE
    ) {
      throw new ConflictException(
        'El ejercicio no está pendiente en una ruta activa',
      );
    }
    // Días por fecha: solo se registran resultados del día habilitado.
    const activeRoute = await this.repository.activeRoute(patient.id);
    if (activeRoute?.id === routeId) {
      const schedule = routeSchedule(activeRoute.ejercicios ?? []);
      if (item.dia > schedule.dia_actual) {
        throw new ForbiddenException('Primero completa los días anteriores');
      }
      if (!schedule.disponible) {
        throw new ForbiddenException(
          `Este día se habilita el ${schedule.disponible_desde}`,
        );
      }
    }

    const minimumScore = this.numericConfig('MIN_SCORE_TO_ADVANCE', 60);
    const referenceTimeMs = this.numericConfig('XP_REFERENCE_TIME_MS', 10000);
    const precisionDivisor = this.numericConfig('XP_PRECISION_DIVISOR', 10);
    const speedBonusMax = this.numericConfig('XP_SPEED_BONUS_MAX', 5);
    const xpPorNivel = this.numericConfig('XP_PER_LEVEL', 100);
    if (minimumScore < 0 || minimumScore > 100) {
      throw new Error('MIN_SCORE_TO_ADVANCE debe estar entre 0 y 100');
    }
    if (
      referenceTimeMs <= 0 ||
      precisionDivisor <= 0 ||
      speedBonusMax < 0 ||
      xpPorNivel <= 0
    ) {
      throw new Error('La configuración de XP contiene valores fuera de rango');
    }

    const speedFactor =
      data.tiempo_reaccion_ms && data.tiempo_reaccion_ms > 0
        ? referenceTimeMs / (referenceTimeMs + data.tiempo_reaccion_ms)
        : 0;
    const xpGanado = Math.max(
      0,
      Math.round(data.puntaje / precisionDivisor + speedFactor * speedBonusMax),
    );
    const shouldAdvance = data.puntaje >= minimumScore;
    const result = await this.repository.saveResult(
      routeExerciseId,
      patient.id,
      {
        puntaje: data.puntaje,
        tiempoReaccionMs: data.tiempo_reaccion_ms ?? null,
        aciertos: data.aciertos,
        xpGanado: shouldAdvance ? xpGanado : 0,
        xpPorNivel,
      },
      shouldAdvance,
    );

    if (!shouldAdvance) {
      throw new ForbiddenException('Puntaje mínimo no alcanzado');
    }

    const previousLevel = patient.nivelActual;
    let insigniasObtenidas: Awaited<
      ReturnType<GamificationUseCase['onExerciseCompleted']>
    > = [];
    try {
      insigniasObtenidas = await this.gamification.onExerciseCompleted(
        patient.id,
        previousLevel,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo evaluar gamificación para paciente ${patient.id}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
    const feedback =
      data.puntaje >= 90
        ? 'Excelente sesión. Continúa con tu ruta terapéutica.'
        : 'Sesión registrada. Sigue practicando para fortalecer tu progreso.';
    return {
      ...this.resultResponse(result, patient.id, item),
      retroalimentacion: feedback,
      insignias_obtenidas: insigniasObtenidas.map((badge) =>
        this.badgeResponse(badge.insignia),
      ),
    };
  }

  async results(patientId: string, page: number, limit: number, actor: Actor) {
    await this.assertPatientAccess(patientId, actor);
    const result = await this.repository.resultsPage(patientId, page, limit);
    return {
      ...result,
      data: result.data.map((item) => this.resultResponse(item, patientId)),
    };
  }

  async routeHistory(
    patientId: string,
    page: number,
    limit: number,
    actor: Actor,
    estado?: RouteStatus,
  ) {
    await this.assertPatientAccess(patientId, actor);
    const result = await this.repository.routesHistory(
      patientId,
      page,
      limit,
      estado,
    );
    return {
      ...result,
      data: result.data.map((route) => this.routeResponse(route)),
    };
  }

  async domainProgress(
    patientId: string,
    desde: string | undefined,
    hasta: string | undefined,
    actor: Actor,
  ) {
    await this.assertPatientAccess(patientId, actor);
    return this.repository.domainProgress(patientId, desde, hasta);
  }

  async temporalProgress(
    patientId: string,
    desde: string | undefined,
    hasta: string | undefined,
    actor: Actor,
  ) {
    await this.assertPatientAccess(patientId, actor);
    return this.repository.temporalProgress(patientId, desde, hasta);
  }

  private numericConfig(key: string, fallback: number) {
    const value = this.config.get<string | number | undefined>(key);
    if (value === undefined) return fallback;
    if (typeof value === 'string' && value.trim() === '') {
      throw new Error(`${key} debe ser un número válido`);
    }
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(parsed)) {
      throw new Error(`${key} debe ser un número válido`);
    }
    return parsed;
  }

  private exerciseResponse(exercise: ExerciseEntity) {
    return {
      id: exercise.id,
      nombre: exercise.nombre,
      categoria: exercise.categoria,
      tipo: exercise.tipo,
      nivel_dificultad: exercise.nivelDificultad,
      nivelDificultad: exercise.nivelDificultad,
      instrucciones: exercise.instrucciones,
      parametros: exercise.parametros,
      estado: exercise.estado,
      especialista_id: exercise.especialista?.id,
      especialistaId: exercise.especialista?.id,
      especialista_nombre: exercise.especialista?.usuario?.nombre ?? null,
      especialistaNombre: exercise.especialista?.usuario?.nombre ?? null,
      fecha_creacion: exercise.fechaCreacion,
      fechaCreacion: exercise.fechaCreacion,
      archivado_en: exercise.archivadoEn ?? null,
      archivadoEn: exercise.archivadoEn ?? null,
    };
  }

  private routeExerciseResponse(item: RouteExerciseEntity, routeId: string) {
    return {
      id: item.id,
      ruta_id: routeId,
      rutaId: routeId,
      ejercicio_id: item.ejercicio.id,
      ejercicioId: item.ejercicio.id,
      orden: item.orden,
      dia: item.dia,
      estado: item.estado,
      fecha_completado: item.fechaCompletado,
      fechaCompletado: item.fechaCompletado,
      ejercicio: this.exerciseResponse(item.ejercicio),
    };
  }

  private routeResponse(route: TherapeuticRouteEntity) {
    return {
      id: route.id,
      paciente_id: route.paciente?.id,
      pacienteId: route.paciente?.id,
      estado: route.estado,
      duracion_dias: route.duracionDias,
      duracionDias: route.duracionDias,
      fecha_creacion: route.fechaCreacion,
      fechaCreacion: route.fechaCreacion,
      ejercicios: (route.ejercicios ?? []).map((item) =>
        this.routeExerciseResponse(item, route.id),
      ),
    };
  }

  private resultResponse(
    result: ExerciseResultEntity,
    patientId: string,
    routeExercise = result.rutaEjercicio,
  ) {
    const exercise = routeExercise?.ejercicio;
    return {
      id: result.id,
      paciente_id: patientId,
      pacienteId: patientId,
      ruta_ejercicio_id: routeExercise?.id,
      rutaEjercicioId: routeExercise?.id,
      puntaje: result.puntaje,
      tiempo_reaccion_ms: result.tiempoReaccionMs,
      tiempoReaccionMs: result.tiempoReaccionMs,
      aciertos: result.aciertos,
      xp_ganado: result.xpGanado,
      xpGanado: result.xpGanado,
      fecha: result.fecha,
      ejercicio_nombre: exercise?.nombre ?? null,
      ejercicioNombre: exercise?.nombre ?? null,
      categoria: exercise?.categoria ?? null,
    };
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

  private async assertExerciseOwner(exerciseId: string, actor: Actor) {
    if (actor.rol === UserRole.ADMINISTRADOR) return;
    if (
      actor.rol !== UserRole.ESPECIALISTA ||
      !(await this.repository.exerciseOwnedBySpecialist(exerciseId, actor.sub))
    ) {
      throw new ForbiddenException(
        'El ejercicio pertenece a otro especialista',
      );
    }
  }

  /**
   * Un paso nuevo de ruta solo puede usar ejercicios propios (incluidas las
   * copias importadas del taller) y no archivados. El administrador no
   * tiene catálogo propio, así que solo se le exige que no esté archivado.
   */
  private assertUsableInNewStep(
    exercise: ExerciseEntity,
    specialistId: string | null,
  ) {
    if (exercise.archivadoEn) {
      throw new BadRequestException(
        `El ejercicio "${exercise.nombre}" está archivado; restáuralo para usarlo`,
      );
    }
    if (specialistId !== null && exercise.especialista?.id !== specialistId) {
      throw new ForbiddenException(
        'Solo puedes usar ejercicios de tu catálogo',
      );
    }
  }

  private async assertUsableBy(exercise: ExerciseEntity, actor: Actor) {
    const specialistId =
      actor.rol === UserRole.ADMINISTRADOR
        ? null
        : await this.repository.specialistIdForUser(actor.sub);
    if (actor.rol !== UserRole.ADMINISTRADOR && !specialistId) {
      throw new ForbiddenException(
        'Solo puedes usar ejercicios de tu catálogo',
      );
    }
    this.assertUsableInNewStep(exercise, specialistId);
  }

  private async assertPatientAccess(patientId: string, actor: Actor) {
    if (actor.rol === UserRole.ADMINISTRADOR) return;
    const allowed =
      actor.rol === UserRole.PACIENTE
        ? (await this.repository.patientForUser(actor.sub))?.id === patientId
        : actor.rol === UserRole.ESPECIALISTA
          ? await this.repository.patientAssignedToSpecialist(
              patientId,
              actor.sub,
            )
          : false;
    if (!allowed)
      throw new ForbiddenException('No tienes acceso a este paciente');
  }

  private async requireActiveRouteAccess(routeId: string, actor: Actor) {
    if (!(await this.repository.routeExists(routeId))) {
      throw new NotFoundException('Ruta no encontrada');
    }
    if (!(await this.repository.routeIsActive(routeId))) {
      throw new ConflictException('La ruta no está activa');
    }
    const patientId = await this.repository.routePatientId(routeId);
    if (!patientId) throw new NotFoundException('Ruta no encontrada');
    await this.assertPatientAccess(patientId, actor);
    return patientId;
  }
}
