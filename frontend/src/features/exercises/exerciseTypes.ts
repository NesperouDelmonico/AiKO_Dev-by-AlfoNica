import type { components } from '../../api/schema'

export type GameType = components['schemas']['TipoJuego']
export type Category = components['schemas']['CategoriaEjercicio']

export const GAME_TYPES: { value: GameType; label: string; hint: string; category: Category }[] = [
  { value: 'reaccion', label: 'Reacción rápida', hint: 'Tocar el círculo apenas aparece.', category: 'Velocidad' },
  { value: 'completar_palabras', label: 'Completar palabras', hint: 'Arrastrar letras faltantes y luego ordenar la frase.', category: 'Memoria' },
  { value: 'recordar_imagenes', label: 'Recordar imágenes', hint: 'Ver imágenes, se voltean y se describe cada una.', category: 'Memoria' },
  { value: 'logica', label: 'Lógica matemática', hint: 'Problemas con respuestas de selección.', category: 'Atención' },
  { value: 'atencion_sostenida', label: 'Atención sostenida', hint: 'Juego en desarrollo en la app.', category: 'Atención' },
  { value: 'memoria_secuencias', label: 'Secuencias de memoria', hint: 'Juego en desarrollo en la app.', category: 'Memoria' },
]

export const DEFAULT_TYPE_BY_CATEGORY: Record<Category, GameType> = {
  Atención: 'atencion_sostenida',
  Memoria: 'memoria_secuencias',
  Velocidad: 'reaccion',
}

export function gameTypeLabel(type: GameType | undefined): string {
  return GAME_TYPES.find((item) => item.value === type)?.label ?? 'Sin tipo'
}

/** Rangos de los juegos numéricos (iguales a los del backend). */
export const NUMERIC_FIELDS: Partial<Record<GameType, { key: string; label: string; min: number; max: number; default: number }[]>> = {
  reaccion: [
    { key: 'intentos', label: 'Intentos', min: 5, max: 30, default: 10 },
    { key: 'tiempo_limite_ms', label: 'Tiempo límite por intento (ms)', min: 300, max: 3000, default: 1500 },
  ],
  atencion_sostenida: [
    { key: 'duracion_segundos', label: 'Duración (segundos)', min: 30, max: 180, default: 60 },
    { key: 'intervalo_ms', label: 'Intervalo entre estímulos (ms)', min: 600, max: 3000, default: 1500 },
  ],
  memoria_secuencias: [
    { key: 'longitud_inicial', label: 'Longitud inicial', min: 2, max: 8, default: 3 },
    { key: 'longitud_maxima', label: 'Longitud máxima', min: 2, max: 9, default: 6 },
    { key: 'tiempo_visualizacion_ms', label: 'Tiempo de visualización (ms)', min: 500, max: 3000, default: 1000 },
  ],
}

export type MemoryCard = { imagen_id: string | null; respuestas: string }
export type LogicQuestion = { enunciado: string; imagen_id: string | null; opciones: string[]; correcta: number }

/** Estado editable del formulario de parámetros (todos los tipos). */
export type ParamsForm = {
  numeric: Record<string, string>
  frase: string
  imagen_id: string | null
  letras_ocultas: string
  duracion_minutos: string
  tarjetas: MemoryCard[]
  tiempo_visualizacion_segundos: string
  preguntas: LogicQuestion[]
}

export const emptyQuestion = (): LogicQuestion => ({ enunciado: '', imagen_id: null, opciones: ['', ''], correcta: 0 })

const asString = (value: unknown, fallback: number | string) =>
  typeof value === 'number' || typeof value === 'string' ? String(value) : String(fallback)

/** Convierte los parámetros guardados en el estado del formulario. */
export function paramsToForm(type: GameType, params: Record<string, unknown> | undefined): ParamsForm {
  const p = params ?? {}
  const numeric: Record<string, string> = {}
  for (const field of NUMERIC_FIELDS[type] ?? []) numeric[field.key] = asString(p[field.key], field.default)
  const cards = Array.isArray(p.imagenes)
    ? (p.imagenes as { imagen_id?: string; respuestas?: string[] }[]).map((card) => ({
        imagen_id: card.imagen_id ?? null,
        respuestas: (card.respuestas ?? []).join(', '),
      }))
    : []
  const questions = Array.isArray(p.preguntas)
    ? (p.preguntas as Partial<LogicQuestion>[]).map((q) => ({
        enunciado: q.enunciado ?? '',
        imagen_id: q.imagen_id ?? null,
        opciones: q.opciones?.length ? q.opciones : ['', ''],
        correcta: q.correcta ?? 0,
      }))
    : []
  return {
    numeric,
    frase: typeof p.frase === 'string' ? p.frase : '',
    imagen_id: typeof p.imagen_id === 'string' ? p.imagen_id : null,
    letras_ocultas: asString(p.letras_ocultas, 2),
    duracion_minutos: asString(typeof p.duracion_segundos === 'number' && type === 'completar_palabras' ? p.duracion_segundos / 60 : 5, 5),
    tarjetas: cards.length ? cards : [{ imagen_id: null, respuestas: '' }],
    tiempo_visualizacion_segundos: asString(p.tiempo_visualizacion_segundos, 8),
    preguntas: questions.length ? questions : [emptyQuestion()],
  }
}

const toInt = (value: string) => (value.trim() === '' ? undefined : Number(value))

/**
 * Convierte el formulario en `parametros` para la API. Devuelve un error
 * legible si falta algo obligatorio (el backend valida los rangos).
 */
export function formToParams(type: GameType, form: ParamsForm): { ok: true; params: Record<string, unknown> } | { ok: false; error: string } {
  switch (type) {
    case 'completar_palabras': {
      if (!form.frase.trim()) return { ok: false, error: 'Escribe la palabra o frase que el paciente debe completar.' }
      const minutes = Number(form.duracion_minutos)
      return {
        ok: true,
        params: {
          frase: form.frase.trim(),
          imagen_id: form.imagen_id,
          letras_ocultas: toInt(form.letras_ocultas),
          duracion_segundos: Number.isFinite(minutes) ? Math.round(minutes * 60) : undefined,
        },
      }
    }
    case 'recordar_imagenes': {
      if (form.tarjetas.some((card) => !card.imagen_id)) return { ok: false, error: 'Sube una imagen en cada tarjeta.' }
      const imagenes = form.tarjetas.map((card) => ({
        imagen_id: card.imagen_id,
        respuestas: card.respuestas.split(',').map((word) => word.trim()).filter(Boolean),
      }))
      if (imagenes.some((card) => card.respuestas.length === 0)) {
        return { ok: false, error: 'Escribe al menos una palabra clave por imagen (separadas por coma).' }
      }
      return { ok: true, params: { imagenes, tiempo_visualizacion_segundos: toInt(form.tiempo_visualizacion_segundos) } }
    }
    case 'logica': {
      const preguntas = form.preguntas.map((q) => ({
        enunciado: q.enunciado.trim(),
        imagen_id: q.imagen_id,
        opciones: q.opciones.map((option) => option.trim()),
        correcta: q.correcta,
      }))
      if (preguntas.some((q) => !q.enunciado)) return { ok: false, error: 'Cada pregunta necesita su enunciado.' }
      if (preguntas.some((q) => q.opciones.some((option) => !option))) return { ok: false, error: 'Completa todas las opciones o quita las vacías.' }
      return { ok: true, params: { preguntas } }
    }
    default: {
      const params: Record<string, unknown> = {}
      for (const field of NUMERIC_FIELDS[type] ?? []) params[field.key] = toInt(form.numeric[field.key] ?? '')
      return { ok: true, params }
    }
  }
}
