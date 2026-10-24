import { RouteExerciseStatus } from '../entities/route-exercise.entity';

const TIME_ZONE = 'America/Bogota';

/** Fecha calendario (YYYY-MM-DD) en Colombia. */
export function localDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function nextDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

export type ScheduleItem = {
  dia: number;
  estado: RouteExerciseStatus;
  fechaCompletado: Date | null;
};

export type RouteSchedule = {
  /** Día en curso: el primero con ejercicios pendientes (o el último). */
  dia_actual: number;
  /** false si el día en curso aún no se habilita por fecha. */
  disponible: boolean;
  /** Fecha (YYYY-MM-DD, hora Colombia) desde la que se habilita. */
  disponible_desde: string | null;
  completada: boolean;
};

/**
 * Un día se habilita el día calendario siguiente a terminar el anterior,
 * para que el paciente no haga toda la ruta de una vez.
 */
export function routeSchedule(
  items: ScheduleItem[],
  now: Date = new Date(),
): RouteSchedule {
  const active = items.filter(
    (item) => item.estado !== RouteExerciseStatus.REEMPLAZADO,
  );
  const days = [...new Set(active.map((item) => item.dia))].sort(
    (a, b) => a - b,
  );
  if (!days.length) {
    return {
      dia_actual: 1,
      disponible: true,
      disponible_desde: null,
      completada: true,
    };
  }
  const current = days.find((day) =>
    active.some(
      (item) =>
        item.dia === day && item.estado === RouteExerciseStatus.PENDIENTE,
    ),
  );
  if (current === undefined) {
    return {
      dia_actual: days[days.length - 1],
      disponible: true,
      disponible_desde: null,
      completada: true,
    };
  }
  const index = days.indexOf(current);
  if (index === 0) {
    return {
      dia_actual: current,
      disponible: true,
      disponible_desde: null,
      completada: false,
    };
  }
  const previous = days[index - 1];
  // Si el día actual ya empezó, no se vuelve a bloquear.
  const started = active.some(
    (item) =>
      item.dia === current && item.estado === RouteExerciseStatus.COMPLETADO,
  );
  const finishedAt = active
    .filter((item) => item.dia === previous && item.fechaCompletado)
    .map((item) => item.fechaCompletado!.getTime());
  if (started || !finishedAt.length) {
    return {
      dia_actual: current,
      disponible: true,
      disponible_desde: null,
      completada: false,
    };
  }
  const from = nextDate(localDate(new Date(Math.max(...finishedAt))));
  const available = localDate(now) >= from;
  return {
    dia_actual: current,
    disponible: available,
    disponible_desde: available ? null : from,
    completada: false,
  };
}
