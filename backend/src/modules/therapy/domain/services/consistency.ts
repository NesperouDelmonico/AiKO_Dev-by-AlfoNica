import { localDate } from './route-schedule';
import { daysToProtect } from '../../../gamification/domain/services/economy';

export type Consistency = {
  /** Mes consultado, YYYY-MM. */
  mes: string;
  /** Hoy en Colombia, YYYY-MM-DD. */
  hoy: string;
  /** Días del mes (YYYY-MM-DD) con al menos un ejercicio realizado. */
  dias_activos: string[];
  /** Días seguidos con práctica, terminando hoy o ayer. */
  racha_actual: number;
  mejor_racha: number;
  /** Intentos registrados de lunes a domingo de la semana actual. */
  ejercicios_semana: number;
  /** Total de días distintos con práctica. */
  dias_activos_total: number;
  /** Días del mes salvados con un salvador de racha (no se practicó). */
  dias_protegidos: string[];
  /** Salvadores de racha disponibles. */
  salvadores_racha: number;
};

function shift(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Lunes (YYYY-MM-DD) de la semana de [isoDate]. */
function weekStart(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return shift(isoDate, -((weekday + 6) % 7));
}

/**
 * Calendario de constancia a partir de las fechas de los resultados. Las
 * fechas se agrupan por día calendario de Colombia.
 */
export function consistency(
  resultDates: Date[],
  month: string,
  now: Date = new Date(),
  saved: { protectedDays?: string[]; savers?: number } = {},
): Consistency {
  const today = localDate(now);
  const perDay = resultDates.map(localDate);
  const days = new Set(perDay);
  const sorted = [...days].sort();
  const savers = saved.savers ?? 0;
  const protectedDays = [...new Set(saved.protectedDays ?? [])].filter(
    (day) => !days.has(day),
  );
  // Para la racha cuentan los días practicados, los ya salvados y los que
  // salvarían los salvadores disponibles si hoy vuelve a practicar.
  const real = new Set([...days, ...protectedDays]);
  const kept = new Set(real);
  for (const day of daysToProtect(kept, today, savers)) kept.add(day);

  let current = 0;
  let cursor = kept.has(today) ? today : shift(today, -1);
  while (kept.has(cursor)) {
    current += 1;
    cursor = shift(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of [...real].sort()) {
    run = previous !== null && shift(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  const monday = weekStart(today);
  const sunday = shift(monday, 6);
  return {
    mes: month,
    hoy: today,
    dias_activos: sorted.filter((day) => day.startsWith(`${month}-`)),
    racha_actual: current,
    mejor_racha: best,
    ejercicios_semana: perDay.filter((day) => day >= monday && day <= sunday)
      .length,
    dias_activos_total: days.size,
    dias_protegidos: protectedDays
      .filter((day) => day.startsWith(`${month}-`))
      .sort(),
    salvadores_racha: savers,
  };
}

/** Mes actual en Colombia, YYYY-MM. */
export function currentMonth(now: Date = new Date()): string {
  return localDate(now).slice(0, 7);
}
