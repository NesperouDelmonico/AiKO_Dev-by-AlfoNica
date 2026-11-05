import type { components } from '../../api/schema'

type WorkshopExercise = components['schemas']['EjercicioTaller']

const minutes = (seconds: unknown) => (typeof seconds === 'number' ? `${Math.round((seconds / 60) * 10) / 10} min` : '—')

/** Resumen legible de los parámetros para la vista previa. */
export function parameterSummary(exercise: Pick<WorkshopExercise, 'tipo' | 'parametros'>): { lines: string[]; images: string[] } {
  const p = (exercise.parametros ?? {}) as Record<string, unknown>
  const list = (key: string) => (Array.isArray(p[key]) ? (p[key] as Record<string, unknown>[]) : [])
  switch (exercise.tipo) {
    case 'completar_palabras': {
      const words = Array.isArray(p.palabras) ? (p.palabras as string[]) : []
      const phrases = Array.isArray(p.frases) ? (p.frases as string[]) : []
      return {
        lines: [
          `Palabras: ${words.join(', ') || '—'}`,
          ...(phrases.length ? [`${phrases.length} ${phrases.length === 1 ? 'frase' : 'frases'}`] : []),
          `${p.letras_faltantes ?? '—'} letras faltantes · ${p.intentos ?? '—'} intentos`,
          `Tiempo total: ${minutes(p.duracion_segundos)}`,
        ],
        images: typeof p.imagen_id === 'string' ? [p.imagen_id] : [],
      }
    }
    case 'memoria_secuencias':
      return { lines: [`${p.botones ?? '—'} botones · ${p.rondas ?? '—'} rondas`, `${p.intentos ?? '—'} intentos · ${p.tiempo_respuesta_segundos ?? '—'} s por ronda`], images: [] }
    case 'toque_color':
      return { lines: [`${p.rondas ?? '—'} rondas con ${p.colores ?? '—'} colores`, `${p.tiempo_limite_ms ?? '—'} ms por ronda`, ...(p.interferencia ? ['Con interferencia de color'] : [])], images: [] }
    case 'busca_imagen':
      return { lines: [`${p.rondas ?? '—'} rondas`, `Cuadrícula de ${p.cuadricula ?? '—'} figuras`, `${p.tiempo_limite_ms ?? '—'} ms por ronda`], images: [] }
    case 'recordar_imagenes': {
      const cards = list('imagenes')
      return {
        lines: [
          `${cards.length} ${cards.length === 1 ? 'imagen' : 'imágenes'} para ${p.modo === 'relacionar' ? 'relacionar' : 'nombrar'}`,
          `${p.tiempo_visualizacion_segundos ?? '—'} s visibles · tiempo total ${minutes(p.duracion_segundos)}`,
          ...(p.dibujar !== false ? ['Al final dibuja lo que recuerda'] : []),
        ],
        images: cards.map((card) => card.imagen_id).filter((id): id is string => typeof id === 'string'),
      }
    }
    case 'logica': {
      const questions = list('preguntas')
      return {
        lines: [`${questions.length} ${questions.length === 1 ? 'pregunta' : 'preguntas'} · tiempo total ${minutes(p.duracion_segundos)}`, ...questions.slice(0, 3).map((q, i) => `${i + 1}. ${String(q.enunciado ?? '')}`)],
        images: questions.map((q) => q.imagen_id).filter((id): id is string => typeof id === 'string'),
      }
    }
    default:
      return { lines: Object.entries(p).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`), images: [] }
  }
}
