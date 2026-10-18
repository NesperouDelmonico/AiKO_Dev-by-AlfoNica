import type { RoutePeriod } from './api'

export const PERIODS: { value: RoutePeriod; label: string }[] = [
  { value: 1, label: 'Un día' },
  { value: 7, label: 'Semana' },
  { value: 15, label: 'Quincena' },
  { value: 30, label: 'Mes' },
]

/** Plan en borrador: por cada día, los ids de ejercicio en orden. */
export type DayPlan = string[][]

export function resizePlan(plan: DayPlan, period: number): DayPlan {
  return Array.from({ length: period }, (_, day) => plan[day] ?? [])
}

/** Días (1..n) que quedarían fuera al reducir el periodo y tienen ejercicios. */
export function daysLostOnResize(plan: DayPlan, period: number): number[] {
  return plan.flatMap((items, index) => (index >= period && items.length ? [index + 1] : []))
}

export function copyDay(plan: DayPlan, from: number, onlyEmpty: boolean): DayPlan {
  return plan.map((items, index) => (index === from || (onlyEmpty && items.length) ? items : [...plan[from]!]))
}

export function emptyDays(plan: DayPlan): number[] {
  return plan.flatMap((items, index) => (items.length ? [] : [index + 1]))
}

/** Pasos para POST /pacientes/:id/rutas (orden global y día). */
export function planToSteps(plan: DayPlan) {
  let order = 0
  return plan.flatMap((items, index) => items.map((ejercicio_id) => ({ ejercicio_id, orden: ++order, dia: index + 1 })))
}

export function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item !== undefined) next.splice(to, 0, item)
  return next
}
