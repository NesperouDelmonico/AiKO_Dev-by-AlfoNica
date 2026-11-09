import arbol from '../../assets/islands/arbol.webp'
import bosque from '../../assets/islands/bosque.webp'
import casa from '../../assets/islands/casa.webp'
import cristal from '../../assets/islands/cristal.webp'
import faro from '../../assets/islands/faro.webp'
import meta from '../../assets/islands/meta.webp'
import molino from '../../assets/islands/molino.webp'
import torre from '../../assets/islands/torre.webp'
import type { TherapyRoute } from './api'

/** Islas del mapa (mismos nombres que en la app, `IslandTheme`). */
export type IslandTheme = { key: string; name: string; image: string }

const BY_TYPE: Record<string, IslandTheme> = {
  completar_palabras: { key: 'palabras', name: 'Isla de las Palabras', image: casa },
  logica: { key: 'logica', name: 'Isla de Cristal', image: cristal },
  recordar_imagenes: { key: 'imagenes', name: 'Isla de los Recuerdos', image: torre },
  memoria_secuencias: { key: 'memoria', name: 'Isla del Gran Árbol', image: arbol },
  toque_color: { key: 'reaccion', name: 'Isla del Molino', image: molino },
  busca_imagen: { key: 'atencion', name: 'Isla del Faro', image: faro },
}

export const MIXED_ISLAND: IslandTheme = { key: 'mixta', name: 'Isla de AiKO', image: bosque }
// Los días mixtos alternan dibujo para que el mapa no se vea repetido.
const MIXED_IMAGES = [bosque, casa, molino, arbol, faro, cristal, torre]
export const GOAL_ISLAND: IslandTheme = { key: 'meta', name: 'Meta', image: meta }

type Step = NonNullable<TherapyRoute['ejercicios']>[number]

export type RouteDay = {
  day: number
  steps: Step[]
  theme: IslandTheme
  completed: number
  total: number
  state: 'done' | 'current' | 'waiting' | 'locked'
}

/** La isla del día: el tipo de juego mayoritario (como en la app). */
export function islandFor(types: Array<string | undefined>, day = 1): IslandTheme {
  const mixed = { ...MIXED_ISLAND, image: MIXED_IMAGES[(day - 1) % MIXED_IMAGES.length]! }
  if (!types.length) return mixed
  const counts = new Map<string, number>()
  for (const type of types) if (type) counts.set(type, (counts.get(type) ?? 0) + 1)
  const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  return count * 2 >= types.length ? (BY_TYPE[best] ?? mixed) : mixed
}

/** Agrupa la ruta en días/islas con su estado. */
export function routeDays(route: TherapyRoute, typeOf: (exerciseId?: string) => string | undefined): RouteDay[] {
  const steps = (route.ejercicios ?? []).filter((step) => step.estado !== 'Reemplazado')
  const numbers = [...new Set(steps.map((step) => step.dia ?? 1))].sort((a, b) => a - b)
  const current = route.agenda?.dia_actual ?? numbers[0] ?? 1
  const available = route.agenda?.disponible ?? true
  return numbers.map((day) => {
    const daySteps = steps.filter((step) => (step.dia ?? 1) === day).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    const completed = daySteps.filter((step) => step.estado === 'Completado').length
    const done = completed === daySteps.length
    const state = done ? 'done' : day === current ? (available ? 'current' : 'waiting') : 'locked'
    return {
      day,
      steps: daySteps,
      theme: islandFor(daySteps.map((step) => step.ejercicio?.tipo ?? typeOf(step.ejercicio_id)), day),
      completed,
      total: daySteps.length,
      state,
    }
  })
}
