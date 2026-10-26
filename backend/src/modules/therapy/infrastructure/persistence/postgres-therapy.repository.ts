import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Not, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  ExerciseEntity,
  ExerciseStatus,
} from '../../domain/entities/exercise.entity';
import {
  TherapeuticRouteEntity,
  RouteStatus,
} from '../../domain/entities/therapeutic-route.entity';
import {
  RouteExerciseEntity,
  RouteExerciseStatus,
} from '../../domain/entities/route-exercise.entity';
import { ExerciseResultEntity } from '../../domain/entities/exercise-result.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { SpecialistEntity } from '../../../users/domain/entities/specialist.entity';
import {
  AlertEntity,
  AlertStatus,
  AlertType,
} from '../../../tracking/domain/entities/alert.entity';
import type {
  ExerciseFilters,
  TherapyRepositoryPort,
} from '../../domain/ports/therapy.repository.port';

@Injectable()
export class PostgresTherapyRepository implements TherapyRepositoryPort {
  constructor(
    @InjectRepository(ExerciseEntity)
    private readonly ex: Repository<ExerciseEntity>,
    @InjectRepository(TherapeuticRouteEntity)
    private readonly routes: Repository<TherapeuticRouteEntity>,
    @InjectRepository(RouteExerciseEntity)
    private readonly items: Repository<RouteExerciseEntity>,
    @InjectRepository(ExerciseResultEntity)
    private readonly result: Repository<ExerciseResultEntity>,
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(SpecialistEntity)
    private readonly specialists: Repository<SpecialistEntity>,
  ) {}
  exercises(filters: ExerciseFilters) {
    const { especialistaUserId, archivados, ...columns } = filters;
    const where: FindOptionsWhere<ExerciseEntity> = {};
    if (columns.categoria !== undefined) where.categoria = columns.categoria;
    if (columns.nivelDificultad !== undefined)
      where.nivelDificultad = columns.nivelDificultad;
    if (columns.estado !== undefined) where.estado = columns.estado;
    if (especialistaUserId)
      where.especialista = { usuario: { id: especialistaUserId } };
    if (archivados !== undefined)
      where.archivadoEn = archivados ? Not(IsNull()) : IsNull();
    return this.ex.find({
      where,
      relations: { especialista: { usuario: true } },
      order: { fechaCreacion: 'DESC' },
    });
  }
  exercise(id: string) {
    return this.ex.findOne({
      where: { id },
      relations: { especialista: { usuario: true } },
    });
  }
  exerciseUsedInRoutes(
    exerciseId: string,
    scope: { pacienteId?: string; especialistaUserId?: string },
  ) {
    if (!scope.pacienteId && !scope.especialistaUserId)
      return Promise.resolve(false);
    return this.items.exists({
      where: {
        ejercicio: { id: exerciseId },
        ruta: {
          paciente: scope.pacienteId
            ? { id: scope.pacienteId }
            : { especialista: { usuario: { id: scope.especialistaUserId } } },
        },
      },
    });
  }
  async specialistIdForUser(userId: string) {
    const specialist = await this.specialists.findOne({
      where: { usuario: { id: userId } },
      select: { id: true },
    });
    return specialist?.id ?? null;
  }
  patientForUser(userId: string) {
    return this.patients.findOne({ where: { usuario: { id: userId } } });
  }
  patientById(patientId: string) {
    return this.patients.findOneBy({ id: patientId });
  }
  patientAssignedToSpecialist(patientId: string, specialistUserId: string) {
    return this.patients.exists({
      where: {
        id: patientId,
        especialista: { usuario: { id: specialistUserId } },
      },
    });
  }
  routeExists(routeId: string) {
    return this.routes.existsBy({ id: routeId });
  }
  async routePatientId(routeId: string) {
    const route = await this.routes.findOne({
      where: { id: routeId },
      relations: { paciente: true },
    });
    return route?.paciente.id ?? null;
  }
  routeIsActive(routeId: string) {
    return this.routes.exists({
      where: { id: routeId, estado: RouteStatus.ACTIVA },
    });
  }
  routeExerciseCount(routeId: string) {
    return this.items.count({
      where: {
        ruta: { id: routeId },
        estado: Not(RouteExerciseStatus.REEMPLAZADO),
      },
    });
  }
  async exerciseAvailableForPatient(patientId: string, exerciseId: string) {
    const [patient, exercise] = await Promise.all([
      this.patients.findOneBy({ id: patientId }),
      this.ex.findOneBy({ id: exerciseId }),
    ]);
    if (!patient || !exercise || exercise.estado !== ExerciseStatus.ACTIVO)
      return false;
    if (exercise.nivelDificultad > patient.nivelActual) return false;
    return this.items.exists({
      where: {
        ejercicio: { id: exerciseId },
        estado: RouteExerciseStatus.PENDIENTE,
        ruta: { paciente: { id: patientId }, estado: RouteStatus.ACTIVA },
      },
    });
  }
  async saveExercise(data: Partial<ExerciseEntity>, specialistUserId: string) {
    const specialist = await this.specialists.findOne({
      where: { usuario: { id: specialistUserId } },
    });
    if (!specialist) throw new Error('SPECIALIST_NOT_FOUND');
    return this.ex.save(this.ex.create({ ...data, especialista: specialist }));
  }
  exerciseOwnedBySpecialist(exerciseId: string, specialistUserId: string) {
    return this.ex.exists({
      where: {
        id: exerciseId,
        especialista: { usuario: { id: specialistUserId } },
      },
    });
  }
  async updateExercise(id: string, data: Partial<ExerciseEntity>) {
    const update = data as QueryDeepPartialEntity<ExerciseEntity>;
    await this.ex.update(id, update);
    return this.exercise(id);
  }
  activeUsage(id: string) {
    return this.items.exists({
      where: {
        ejercicio: { id },
        estado: In([
          RouteExerciseStatus.PENDIENTE,
          RouteExerciseStatus.COMPLETADO,
        ]),
        ruta: { estado: RouteStatus.ACTIVA },
      },
    });
  }
  async createRoute(
    patientId: string,
    values: { ejercicioId: string; orden: number; dia: number }[],
    duracionDias?: number,
  ) {
    return this.routes.manager.transaction(async (manager) => {
      const patient = await manager
        .createQueryBuilder(PatientEntity, 'patient')
        .setLock('pessimistic_write')
        .where('patient.id = :patientId', { patientId })
        .getOneOrFail();
      const activeCount = await manager.count(TherapeuticRouteEntity, {
        where: { paciente: { id: patientId }, estado: RouteStatus.ACTIVA },
      });
      if (activeCount > 0) {
        throw new Error('ACTIVE_ROUTE_CONFLICT');
      }
      const uniqueIds = [...new Set(values.map((value) => value.ejercicioId))];
      const exercises = await manager.findBy(ExerciseEntity, {
        id: In(uniqueIds),
        estado: 'Activo' as ExerciseEntity['estado'],
        archivadoEn: IsNull(),
      });
      if (exercises.length !== uniqueIds.length) {
        throw new Error('ROUTE_EXERCISE_NOT_AVAILABLE');
      }
      const route = await manager.save(
        TherapeuticRouteEntity,
        manager.create(TherapeuticRouteEntity, {
          paciente: patient,
          estado: RouteStatus.ACTIVA,
          duracionDias: duracionDias ?? null,
          ejercicios: [],
        }),
      );
      await manager.save(
        RouteExerciseEntity,
        values.map((value) =>
          manager.create(RouteExerciseEntity, {
            ruta: route,
            ejercicio: exercises.find(
              (exercise) => exercise.id === value.ejercicioId,
            )!,
            orden: value.orden,
            dia: value.dia,
            estado: RouteExerciseStatus.PENDIENTE,
          }),
        ),
      );
      return manager.findOneOrFail(TherapeuticRouteEntity, {
        where: { id: route.id },
        relations: {
          paciente: true,
          ejercicios: { ejercicio: { especialista: true } },
        },
      });
    });
  }
  activeRoute(patientId: string) {
    return this.routes.findOne({
      where: { paciente: { id: patientId }, estado: RouteStatus.ACTIVA },
      relations: {
        paciente: true,
        ejercicios: { ejercicio: { especialista: true } },
      },
    });
  }
  async progress(id: string) {
    const all = await this.items.find({
      where: {
        ruta: { id },
        estado: In([
          RouteExerciseStatus.PENDIENTE,
          RouteExerciseStatus.COMPLETADO,
        ]),
      },
    });
    const completados = all.filter(
      (item) => item.estado === RouteExerciseStatus.COMPLETADO,
    ).length;
    return {
      completados,
      pendientes: all.length - completados,
      porcentaje: all.length ? (completados * 100) / all.length : 0,
    };
  }
  async addRouteExercise(
    routeId: string,
    exerciseId: string,
    orden: number,
    dia?: number,
  ) {
    return this.routes.manager.transaction(async (manager) => {
      const ruta = await manager.findOneOrFail(TherapeuticRouteEntity, {
        where: { id: routeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (ruta.estado !== RouteStatus.ACTIVA) {
        throw new Error('ROUTE_NOT_ACTIVE');
      }
      const currentCount = await manager.count(RouteExerciseEntity, {
        where: {
          ruta: { id: routeId },
          estado: Not(RouteExerciseStatus.REEMPLAZADO),
        },
      });
      if (orden !== currentCount + 1) {
        throw new Error('ROUTE_ORDER_INVALID');
      }
      const last = await manager.findOne(RouteExerciseEntity, {
        where: {
          ruta: { id: routeId },
          estado: Not(RouteExerciseStatus.REEMPLAZADO),
        },
        order: { orden: 'DESC' },
      });
      const lastDay = last?.dia ?? 1;
      const day = dia ?? lastDay;
      if (
        day < lastDay ||
        day > lastDay + 1 ||
        (ruta.duracionDias !== null && day > ruta.duracionDias)
      ) {
        throw new Error('ROUTE_DAY_INVALID');
      }
      const ejercicio = await manager.findOneByOrFail(ExerciseEntity, {
        id: exerciseId,
      });
      return manager.save(
        RouteExerciseEntity,
        manager.create(RouteExerciseEntity, {
          ruta,
          ejercicio,
          orden,
          dia: day,
          estado: RouteExerciseStatus.PENDIENTE,
        }),
      );
    });
  }
  routeExercise(id: string) {
    return this.items.findOne({
      where: { id },
      relations: { ruta: true, ejercicio: true },
    });
  }
  routeExerciseInRoute(routeId: string, routeExerciseId: string) {
    return this.items.findOne({
      where: { id: routeExerciseId, ruta: { id: routeId } },
      relations: { ruta: { paciente: true }, ejercicio: true },
    });
  }
  /**
   * Bloquea la ruta y luego el ejercicio de la ruta (mismo orden que
   * addRouteExercise). No se puede pedir la relación `ruta` junto con el
   * bloqueo: TypeORM genera LEFT JOIN … FOR UPDATE y Postgres lo rechaza
   * ("FOR UPDATE cannot be applied to the nullable side of an outer join").
   */
  private async lockRouteExercise(
    manager: import('typeorm').EntityManager,
    id: string,
  ) {
    const ref = await manager.findOne(RouteExerciseEntity, {
      where: { id },
      relations: { ruta: true },
    });
    if (!ref) return null;
    const route = await manager.findOneOrFail(TherapeuticRouteEntity, {
      where: { id: ref.ruta.id },
      lock: { mode: 'pessimistic_write' },
    });
    const item = await manager.findOneOrFail(RouteExerciseEntity, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    item.ruta = route;
    return { route, item };
  }
  async removeRouteExercise(id: string) {
    await this.routes.manager.transaction(async (manager) => {
      const locked = await this.lockRouteExercise(manager, id);
      if (!locked) throw new Error('ROUTE_EXERCISE_NOT_FOUND');
      const { route, item } = locked;
      if (route.estado !== RouteStatus.ACTIVA) {
        throw new Error('ROUTE_NOT_ACTIVE');
      }
      if (item.estado === RouteExerciseStatus.COMPLETADO) {
        throw new Error('ROUTE_EXERCISE_ALREADY_COMPLETED');
      }

      const attempts = await manager.count(ExerciseResultEntity, {
        where: { rutaEjercicio: { id } },
      });
      if (attempts > 0) {
        item.estado = RouteExerciseStatus.REEMPLAZADO;
        await manager.save(item);
      } else {
        await manager.delete(RouteExerciseEntity, { id });
      }
      await this.resequenceActiveItems(manager, route.id);
    });
  }
  async resequenceRoute(routeId: string) {
    await this.routes.manager.transaction(async (manager) => {
      await manager.findOneOrFail(TherapeuticRouteEntity, {
        where: { id: routeId },
        lock: { mode: 'pessimistic_write' },
      });
      await this.resequenceActiveItems(manager, routeId);
    });
  }
  async replaceRouteExercise(id: string, exerciseId: string) {
    return this.routes.manager.transaction(async (manager) => {
      const locked = await this.lockRouteExercise(manager, id);
      if (!locked) return null;
      const { route, item: old } = locked;
      if (route.estado !== RouteStatus.ACTIVA) {
        throw new Error('ROUTE_NOT_ACTIVE');
      }
      if (old.estado === RouteExerciseStatus.COMPLETADO) {
        throw new Error('ROUTE_EXERCISE_ALREADY_COMPLETED');
      }
      const exercise = await manager.findOneOrFail(ExerciseEntity, {
        where: { id: exerciseId, estado: ExerciseStatus.ACTIVO },
      });
      old.estado = RouteExerciseStatus.REEMPLAZADO;
      await manager.save(old);
      return manager.save(
        RouteExerciseEntity,
        manager.create(RouteExerciseEntity, {
          ruta: route,
          ejercicio: exercise,
          orden: old.orden,
          dia: old.dia,
          estado: RouteExerciseStatus.PENDIENTE,
        }),
      );
    });
  }
  async saveResult(
    routeExerciseId: string,
    patientId: string,
    data: {
      puntaje: number;
      tiempoReaccionMs: number | null;
      aciertos: number;
      xpGanado: number;
      xpPorNivel: number;
    },
    shouldAdvance = true,
  ) {
    return this.result.manager.transaction(async (manager) => {
      const item = await manager
        .createQueryBuilder(RouteExerciseEntity, 'item')
        .leftJoinAndSelect('item.ruta', 'route')
        .setLock('pessimistic_write', undefined, ['item'])
        .where('item.id = :routeExerciseId', { routeExerciseId })
        .getOneOrFail();
      if (item.estado !== RouteExerciseStatus.PENDIENTE) {
        throw new Error('ROUTE_EXERCISE_ALREADY_COMPLETED');
      }
      const patient = await manager
        .createQueryBuilder(PatientEntity, 'patient')
        .setLock('pessimistic_write')
        .where('patient.id = :patientId', { patientId })
        .getOneOrFail();
      if (shouldAdvance) {
        patient.xpTotal += data.xpGanado;
        patient.nivelActual = Math.floor(patient.xpTotal / data.xpPorNivel) + 1;
      }
      await manager.save(patient);
      if (shouldAdvance) {
        item.estado = RouteExerciseStatus.COMPLETADO;
        item.fechaCompletado = new Date();
        await manager.save(item);

        const pendingCount = await manager.count(RouteExerciseEntity, {
          where: {
            ruta: { id: item.ruta.id },
            estado: RouteExerciseStatus.PENDIENTE,
          },
        });
        if (pendingCount === 0) {
          const route = await manager.findOneBy(TherapeuticRouteEntity, {
            id: item.ruta.id,
          });
          if (route) {
            route.estado = RouteStatus.HISTORICA;
            await manager.save(route);
          }
        }
      }
      const result = await manager.save(
        ExerciseResultEntity,
        manager.create(ExerciseResultEntity, {
          rutaEjercicio: item,
          paciente: patient,
          puntaje: data.puntaje,
          tiempoReaccionMs: data.tiempoReaccionMs,
          aciertos: data.aciertos,
          xpGanado: data.xpGanado,
        }),
      );
      await manager
        .getRepository(AlertEntity)
        .createQueryBuilder()
        .update()
        .set({ estado: AlertStatus.RESUELTA })
        .where('"paciente_id" = :patientId', { patientId })
        .andWhere('"tipo" = :type', { type: AlertType.INACTIVIDAD })
        .andWhere('"estado" = :active', { active: AlertStatus.ACTIVA })
        .execute();
      return result;
    });
  }

  private async resequenceActiveItems(
    manager: import('typeorm').EntityManager,
    routeId: string,
  ) {
    const entries = await manager.find(RouteExerciseEntity, {
      where: {
        ruta: { id: routeId },
        estado: Not(RouteExerciseStatus.REEMPLAZADO),
      },
      order: { orden: 'ASC', id: 'ASC' },
    });
    const highestOrder = entries.reduce(
      (highest, entry) => Math.max(highest, entry.orden),
      0,
    );
    for (const [index, entry] of entries.entries()) {
      await manager.update(RouteExerciseEntity, entry.id, {
        orden: highestOrder + index + 1,
      });
    }
    for (const [index, entry] of entries.entries()) {
      await manager.update(RouteExerciseEntity, entry.id, { orden: index + 1 });
    }
  }
  results(patientId: string) {
    return this.result.find({
      where: { paciente: { id: patientId } },
      relations: { rutaEjercicio: { ejercicio: true } },
      order: { fecha: 'DESC' },
    });
  }
  async resultsPage(patientId: string, page: number, limit: number) {
    const [data, total] = await this.result.findAndCount({
      where: { paciente: { id: patientId } },
      relations: { rutaEjercicio: { ejercicio: true } },
      order: { fecha: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { total, page, limit, data };
  }
  async routesHistory(
    patientId: string,
    page: number,
    limit: number,
    estado?: RouteStatus,
  ) {
    const [data, total] = await this.routes.findAndCount({
      where: {
        paciente: { id: patientId },
        ...(estado ? { estado } : {}),
      },
      relations: {
        paciente: true,
        ejercicios: { ejercicio: { especialista: true } },
      },
      order: { fechaCreacion: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { total, page, limit, data };
  }
  async domainProgress(patientId: string, desde?: string, hasta?: string) {
    const query = this.result
      .createQueryBuilder('result')
      .innerJoin('result.rutaEjercicio', 'routeExercise')
      .innerJoin('routeExercise.ejercicio', 'exercise')
      .select('exercise.categoria', 'categoria')
      .addSelect('exercise.id', 'ejercicioId')
      .addSelect('exercise.nombre', 'nombre')
      .addSelect('COUNT(result.id)', 'intentos')
      .addSelect('AVG(result.puntaje)', 'promedio')
      .addSelect('MAX(result.puntaje)', 'mejor')
      .addSelect(
        '(ARRAY_AGG(result.puntaje ORDER BY result.fecha DESC, result.id DESC))[1]',
        'ultimo',
      )
      .where('result.paciente = :patientId', { patientId });
    if (desde) {
      query.andWhere('result.fecha >= CAST(:desde AS date)', { desde });
    }
    if (hasta) {
      query.andWhere("result.fecha < CAST(:hasta AS date) + INTERVAL '1 day'", {
        hasta,
      });
    }
    const rows = await query
      .groupBy('exercise.categoria')
      .addGroupBy('exercise.id')
      .addGroupBy('exercise.nombre')
      .orderBy('exercise.categoria', 'ASC')
      .addOrderBy('exercise.nombre', 'ASC')
      .getRawMany<{
        categoria: string;
        ejercicioId: string;
        nombre: string;
        intentos: string;
        promedio: string;
        mejor: string;
        ultimo: string;
      }>();

    const categories = new Map<
      string,
      {
        totalScore: number;
        totalAttempts: number;
        ejercicios: {
          ejercicio_id: string;
          nombre: string;
          intentos: number;
          promedio_puntaje: number;
          mejor_puntaje: number;
          ultimo_puntaje: number;
        }[];
      }
    >();
    for (const row of rows) {
      const intentos = Number(row.intentos);
      const promedio = Number(row.promedio);
      const category = categories.get(row.categoria) ?? {
        totalScore: 0,
        totalAttempts: 0,
        ejercicios: [],
      };
      category.totalScore += promedio * intentos;
      category.totalAttempts += intentos;
      category.ejercicios.push({
        ejercicio_id: row.ejercicioId,
        nombre: row.nombre,
        intentos,
        promedio_puntaje: promedio,
        mejor_puntaje: Number(row.mejor),
        ultimo_puntaje: Number(row.ultimo),
      });
      categories.set(row.categoria, category);
    }
    return [...categories.entries()].map(([categoria, value]) => ({
      categoria,
      porcentaje: value.totalAttempts
        ? value.totalScore / value.totalAttempts
        : 0,
      ejercicios: value.ejercicios,
    }));
  }
  async temporalProgress(patientId: string, desde?: string, hasta?: string) {
    const results = await this.results(patientId);
    const filtered = results.filter(
      (result) =>
        (!desde || result.fecha >= new Date(`${desde}T00:00:00`)) &&
        (!hasta || result.fecha <= new Date(`${hasta}T23:59:59.999`)),
    );
    const grouped = new Map<string, { total: number; count: number }>();
    for (const result of filtered) {
      const date = result.fecha.toISOString().slice(0, 10);
      const current = grouped.get(date) ?? { total: 0, count: 0 };
      current.total += result.puntaje;
      current.count += 1;
      grouped.set(date, current);
    }
    const serie = [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([fecha, value]) => ({
        fecha,
        valor: value.count ? value.total / value.count : 0,
      }));
    return {
      serie,
      aviso: serie.length < 2 ? 'Hay menos de 2 sesiones registradas' : null,
    };
  }
}
