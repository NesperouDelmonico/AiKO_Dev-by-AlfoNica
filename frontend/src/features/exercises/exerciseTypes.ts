import type { components } from '../../api/schema'

export type GameType = components['schemas']['TipoJuego']
export type Category = components['schemas']['CategoriaEjercicio']

/** Juegos vigentes, agrupados por clasificación cognitiva (igual que el backend). */
export const GAME_TYPES: { value: GameType; label: string; hint: string; category: Category }[] = [
  { value: 'completar_palabras', label: 'Completar palabras', hint: 'Fichas tipo scrabble: completa palabras y luego ordena frases.', category: 'Atención' },
  { value: 'logica', label: 'Lógica matemática', hint: 'Problemas con respuestas tipo examen (A, B, C…).', category: 'Atención' },
  { value: 'recordar_imagenes', label: 'Recordar imágenes', hint: 'Memoriza imágenes, se ocultan y las nombra o ubica; luego las dibuja.', category: 'Memoria' },
  { value: 'memoria_secuencias', label: 'Secuencia de colores', hint: 'Botones que se iluminan con una nota; el paciente repite la secuencia, que crece cada ronda.', category: 'Memoria' },
  { value: 'toque_color', label: 'Toque de color', hint: 'Aparece el nombre de un color y el paciente toca rápido el botón de ese color.', category: 'Velocidad' },
  { value: 'busca_imagen', label: 'Busca la imagen', hint: 'Se muestra una figura y el paciente la encuentra rápido en una cuadrícula.', category: 'Velocidad' },
]

export const CATEGORIES: Category[] = ['Atención', 'Memoria', 'Velocidad']

export const DEFAULT_TYPE_BY_CATEGORY: Record<Category, GameType> = {
  Atención: 'completar_palabras',
  Memoria: 'recordar_imagenes',
  Velocidad: 'toque_color',
}

export const gamesOf = (category: Category) => GAME_TYPES.filter((game) => game.category === category)

export const categoryOf = (type: GameType | undefined): Category | undefined =>
  GAME_TYPES.find((game) => game.value === type)?.category

const RETIRED_LABELS: Partial<Record<GameType, string>> = {
  reaccion: 'Reacción rápida (retirado)',
  atencion_sostenida: 'Atención sostenida (retirado)',
}

export function gameTypeLabel(type: GameType | undefined): string {
  return GAME_TYPES.find((item) => item.value === type)?.label ?? (type && RETIRED_LABELS[type]) ?? 'Sin tipo'
}

type NumericField = { key: string; label: string; min: number; max: number; default: number; hint?: string }

/** Parámetros numéricos de cada juego (mismos rangos que el backend). */
export const NUMERIC_FIELDS: Partial<Record<GameType, NumericField[]>> = {
  completar_palabras: [
    { key: 'letras_faltantes', label: 'Letras faltantes por palabra', min: 1, max: 4, default: 2 },
    { key: 'intentos', label: 'Intentos por partida', min: 1, max: 10, default: 3, hint: 'Errores permitidos antes de terminar.' },
  ],
  recordar_imagenes: [
    { key: 'tiempo_visualizacion_segundos', label: 'Tiempo visibles (segundos)', min: 5, max: 30, default: 8 },
  ],
  memoria_secuencias: [
    { key: 'botones', label: 'Número de botones', min: 3, max: 9, default: 4 },
    { key: 'rondas', label: 'Número de rondas', min: 3, max: 12, default: 6, hint: 'Cada ronda suma un botón a la secuencia.' },
    { key: 'intentos', label: 'Intentos totales', min: 1, max: 5, default: 3, hint: 'Errores permitidos en toda la partida.' },
    { key: 'tiempo_respuesta_segundos', label: 'Duración de cada ronda (segundos)', min: 5, max: 60, default: 15 },
  ],
  toque_color: [
    { key: 'rondas', label: 'Rondas', min: 5, max: 40, default: 15 },
    { key: 'colores', label: 'Botones de color', min: 3, max: 6, default: 4 },
    { key: 'tiempo_limite_ms', label: 'Tiempo por ronda (ms)', min: 800, max: 5000, default: 2500 },
  ],
  busca_imagen: [
    { key: 'rondas', label: 'Rondas', min: 5, max: 30, default: 10 },
    { key: 'tiempo_limite_ms', label: 'Tiempo por ronda (ms)', min: 1500, max: 15000, default: 6000 },
  ],
}

/** Juegos con tiempo total de partida (en minutos en el formulario). */
export const HAS_TOTAL_TIME: GameType[] = ['completar_palabras', 'logica', 'recordar_imagenes']
export const GRID_SIZES = [4, 6, 9, 12, 16]

export type MemoryCard = { imagen_id: string | null; respuestas: string }
export type LogicQuestion = { enunciado: string; imagen_id: string | null; opciones: string[]; correcta: number }

/** Estado editable del formulario de parámetros (todos los tipos). */
export type ParamsForm = {
  numeric: Record<string, string>
  duracion_minutos: string
  palabras: string
  frases: string
  imagen_id: string | null
  tarjetas: MemoryCard[]
  modo: 'nombrar' | 'relacionar'
  dibujar: boolean
  preguntas: LogicQuestion[]
  interferencia: boolean
  cuadricula: string
}

export const emptyQuestion = (): LogicQuestion => ({ enunciado: '', imagen_id: null, opciones: ['', ''], correcta: 0 })
const emptyCard = (): MemoryCard => ({ imagen_id: null, respuestas: '' })

const asString = (value: unknown, fallback: number | string) =>
  typeof value === 'number' || typeof value === 'string' ? String(value) : String(fallback)

const lines = (value: unknown) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string').join('\n') : '')

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
    duracion_minutos: asString(typeof p.duracion_segundos === 'number' ? p.duracion_segundos / 60 : 5, 5),
    palabras: lines(p.palabras),
    frases: lines(p.frases),
    imagen_id: typeof p.imagen_id === 'string' ? p.imagen_id : null,
    tarjetas: cards.length >= 2 ? cards : [...cards, ...Array.from({ length: 2 - cards.length }, emptyCard)],
    modo: p.modo === 'relacionar' ? 'relacionar' : 'nombrar',
    dibujar: p.dibujar !== false,
    preguntas: questions.length ? questions : [emptyQuestion()],
    interferencia: p.interferencia === true,
    cuadricula: asString(p.cuadricula, 9),
  }
}

const toInt = (value: string) => (value.trim() === '' ? undefined : Number(value))
const splitLines = (value: string) => value.split('\n').map((line) => line.trim().replace(/\s+/g, ' ')).filter(Boolean)

function numbers(type: GameType, form: ParamsForm) {
  const params: Record<string, unknown> = {}
  for (const field of NUMERIC_FIELDS[type] ?? []) params[field.key] = toInt(form.numeric[field.key] ?? '')
  if (HAS_TOTAL_TIME.includes(type)) {
    const minutes = Number(form.duracion_minutos)
    params.duracion_segundos = Number.isFinite(minutes) && form.duracion_minutos.trim() ? Math.round(minutes * 60) : undefined
  }
  return params
}

/**
 * Convierte el formulario en `parametros` para la API. Devuelve un error
 * legible si falta algo obligatorio (el backend valida los rangos).
 */
export function formToParams(type: GameType, form: ParamsForm): { ok: true; params: Record<string, unknown> } | { ok: false; error: string } {
  switch (type) {
    case 'completar_palabras': {
      const palabras = splitLines(form.palabras)
      if (!palabras.length) return { ok: false, error: 'Escribe al menos una palabra (una por línea).' }
      if (palabras.some((word) => word.includes(' '))) return { ok: false, error: 'En "Palabras" va una sola palabra por línea; las frases van abajo.' }
      return { ok: true, params: { ...numbers(type, form), palabras, frases: splitLines(form.frases), imagen_id: form.imagen_id } }
    }
    case 'recordar_imagenes': {
      if (form.tarjetas.length < 2) return { ok: false, error: 'Agrega al menos dos imágenes.' }
      if (form.tarjetas.some((card) => !card.imagen_id)) return { ok: false, error: 'Sube una imagen en cada tarjeta.' }
      const imagenes = form.tarjetas.map((card) => ({
        imagen_id: card.imagen_id,
        respuestas: card.respuestas.split(',').map((word) => word.trim()).filter(Boolean),
      }))
      if (form.modo === 'nombrar' && imagenes.some((card) => card.respuestas.length === 0)) {
        return { ok: false, error: 'Escribe al menos una palabra clave por imagen (separadas por coma).' }
      }
      return { ok: true, params: { ...numbers(type, form), imagenes, modo: form.modo, dibujar: form.dibujar } }
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
      return { ok: true, params: { ...numbers(type, form), preguntas } }
    }
    case 'toque_color':
      return { ok: true, params: { ...numbers(type, form), interferencia: form.interferencia } }
    case 'busca_imagen':
      return { ok: true, params: { ...numbers(type, form), cuadricula: Number(form.cuadricula) } }
    default:
      return { ok: true, params: numbers(type, form) }
  }
}
