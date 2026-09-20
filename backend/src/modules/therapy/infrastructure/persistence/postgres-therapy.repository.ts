import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ExerciseEntity } from '../../domain/entities/exercise.entity';
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
import type { TherapyRepositoryPort } from '../../domain/ports/therapy.repository.port';

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
  ) {}
  exercises(filters: Partial<ExerciseEntity>) {
    return this.ex.find({
      where: filters,
      order: { fechaCreacion: 'DESC' },
    });
  }
  exercise(id: string) {
    return this.ex.findOne({ where: { id } });
  }
  saveExercise(data: Partial<ExerciseEntity>) {
    return this.ex.save(this.ex.create(data));
  }
  async updateExercise(id: string, data: Partial<ExerciseEntity>) {
    await this.ex.update(id, data as any);
    return this.exercise(id);
  }
  activeUsage(id: string) {
    return this.items.exists({ where: { ejercicio: { id } } });
  }
  async createRoute(
    patientId: string,
    values: { ejercicioId: string; orden: number }[],
  ) {
    const paciente = await this.patients.findOneByOrFail({ id: patientId });
    const ruta = await this.routes.save(
      this.routes.create({
        paciente,
        estado: RouteStatus.ACTIVA,
        ejercicios: [],
      }),
    );
    const exercises = await this.ex.findBy({
      id: In(values.map((value) => value.ejercicioId)),
    });
    await this.items.save(
      values.map((value) =>
        this.items.create({
          ruta,
          ejercicio: exercises.find(
            (exercise) => exercise.id === value.ejercicioId,
          ),
          orden: value.orden,
          estado: RouteExerciseStatus.PENDIENTE,
        }),
      ),
    );
    return this.routes.findOneOrFail({
      where: { id: ruta.id },
      relations: { ejercicios: { ejercicio: true } },
    });
  }
  activeRoute(patientId: string) {
    return this.routes.findOne({
      where: { paciente: { id: patientId }, estado: RouteStatus.ACTIVA },
      relations: { ejercicios: { ejercicio: true } },
    });
  }
  async progress(id: string) {
    const all = await this.items.find({ where: { ruta: { id } } });
    const completados = all.filter(
      (item) => item.estado === RouteExerciseStatus.COMPLETADO,
    ).length;
    return {
      completados,
      pendientes: all.length - completados,
      porcentaje: all.length ? (completados * 100) / all.length : 0,
    };
  }
  async addRouteExercise(routeId: string, exerciseId: string, orden: number) {
    const ruta = await this.routes.findOneByOrFail({ id: routeId });
    const ejercicio = await this.ex.findOneByOrFail({ id: exerciseId });
    return this.items.save(
      this.items.create({
        ruta,
        ejercicio,
        orden,
        estado: RouteExerciseStatus.PENDIENTE,
      }),
    );
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
      relations: { ruta: true, ejercicio: true },
    });
  }
  async removeRouteExercise(id: string) {
    await this.items.delete(id);
  }
  async replaceRouteExercise(id: string, exerciseId: string) {
    const old = await this.routeExercise(id);
    if (!old) return null;
    old.estado = RouteExerciseStatus.REEMPLAZADO;
    await this.items.save(old);
    return this.addRouteExercise(old.ruta.id, exerciseId, old.orden);
  }
  async saveResult(routeExerciseId: string, patientId: string, data: any) {
    const item = await this.routeExercise(routeExerciseId);
    const paciente = await this.patients.findOneByOrFail({ id: patientId });
    item!.estado = RouteExerciseStatus.COMPLETADO;
    await this.items.save(item!);
    return this.result.save(
      this.result.create({ rutaEjercicio: item, paciente, ...data }),
    ) as unknown as Promise<ExerciseResultEntity>;
  }
  results(patientId: string) {
    return this.result.find({
      where: { paciente: { id: patientId } },
      relations: { rutaEjercicio: { ejercicio: true } },
      order: { fecha: 'DESC' },
    });
  }
  async domainProgress(patientId: string, desde?: string, hasta?: string) {
    const results = await this.results(patientId);
    const filtered = results.filter(
      (result) =>
        (!desde || result.fecha >= new Date(`${desde}T00:00:00`)) &&
        (!hasta || result.fecha <= new Date(`${hasta}T23:59:59.999`)),
    );
    const grouped = new Map<string, { total: number; count: number }>();
    for (const result of filtered) {
      const category = result.rutaEjercicio?.ejercicio?.categoria;
      if (!category) continue;
      const current = grouped.get(category) ?? { total: 0, count: 0 };
      current.total += result.puntaje;
      current.count += 1;
      grouped.set(category, current);
    }
    return [...grouped.entries()].map(([categoria, value]) => ({
      categoria,
      porcentaje: value.count ? value.total / value.count : 0,
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
