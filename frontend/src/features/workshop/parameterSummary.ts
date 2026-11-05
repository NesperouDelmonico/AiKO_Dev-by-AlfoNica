import type { components } from '../../api/schema'

type WorkshopExercise = components['schemas']['EjercicioTaller']

/** Resumen legible de los parámetros para la vista previa. */
export function parameterSummary(exercise: Pick<WorkshopExercise, 'tipo' | 'parametros'>): { lines: string[]; images: string[] } {
  const p = (exercise.parametros ?? {}) as Record<string, unknown>
  const list = (key: string) => (Array.isArray(p[key]) ? (p[key] as Record<string, unknown>[]) : [])
  switch (exercise.tipo) {
    case 'reaccion':
      return { lines: [`${p.intentos ?? '—'} intentos`, `Tiempo límite: ${p.tiempo_limite_ms ?? '—'} ms`], images: [] }
    case 'completar_palabras':
      return {
        lines: [`Frase: “${String(p.frase ?? '')}”`, `${p.letras_ocultas ?? '—'} letras ocultas por palabra`, `Tiempo máximo: ${Math.round(Number(p.duracion_segundos ?? 0) / 60)} min`],
        images: typeof p.imagen_id === 'string' ? [p.imagen_id] : [],
      }
    case 'recordar_imagenes': {
      const cards = list('imagenes')
      return {
        lines: [`${cards.length} ${cards.length === 1 ? 'imagen' : 'imágenes'} para recordar`, `${p.tiempo_visualizacion_segundos ?? '—'} s para memorizar`],
        images: cards.map((card) => card.imagen_id).filter((id): id is string => typeof id === 'string'),
      }
    }
    case 'logica': {
      const questions = list('preguntas')
      return {
        lines: [`${questions.length} ${questions.length === 1 ? 'pregunta' : 'preguntas'}`, ...questions.slice(0, 3).map((q, i) => `${i + 1}. ${String(q.enunciado ?? '')}`)],
        images: questions.map((q) => q.imagen_id).filter((id): id is string => typeof id === 'string'),
      }
    }
    default:
      return { lines: Object.entries(p).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`), images: [] }
  }
}
