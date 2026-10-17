import { CognitiveCategory } from '../entities/exercise.entity';

type Range = { min: number; max: number; default: number };

/**
 * Parámetros básicos que entiende cada mini-juego de la app móvil.
 * Si cambian aquí, hay que actualizar el juego de la categoría.
 */
export const EXERCISE_PARAMETERS: Record<
  CognitiveCategory,
  Record<string, Range>
> = {
  [CognitiveCategory.ATENCION]: {
    duracion_segundos: { min: 30, max: 180, default: 60 },
    intervalo_ms: { min: 600, max: 3000, default: 1500 },
  },
  [CognitiveCategory.MEMORIA]: {
    longitud_inicial: { min: 2, max: 8, default: 3 },
    longitud_maxima: { min: 2, max: 9, default: 6 },
    tiempo_visualizacion_ms: { min: 500, max: 3000, default: 1000 },
  },
  [CognitiveCategory.VELOCIDAD]: {
    intentos: { min: 5, max: 30, default: 10 },
    tiempo_limite_ms: { min: 300, max: 3000, default: 1500 },
  },
};

export type ParametersCheck =
  | { ok: true; parametros: Record<string, number> }
  | { ok: false; errores: string[] };

/** Valida los parámetros de una categoría y completa los que falten. */
export function normalizeExerciseParameters(
  categoria: CognitiveCategory,
  parametros: Record<string, unknown>,
): ParametersCheck {
  const schema = EXERCISE_PARAMETERS[categoria];
  const errores: string[] = [];
  const result: Record<string, number> = {};

  for (const key of Object.keys(parametros)) {
    if (!(key in schema)) {
      errores.push(
        `"${key}" no es un parámetro de ${categoria}. Permitidos: ${Object.keys(schema).join(', ')}`,
      );
    }
  }
  for (const [key, range] of Object.entries(schema)) {
    const value = parametros[key];
    if (value === undefined || value === null) {
      result[key] = range.default;
      continue;
    }
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      errores.push(`"${key}" debe ser un número entero`);
      continue;
    }
    if (value < range.min || value > range.max) {
      errores.push(`"${key}" debe estar entre ${range.min} y ${range.max}`);
      continue;
    }
    result[key] = value;
  }
  if (
    categoria === CognitiveCategory.MEMORIA &&
    !errores.length &&
    result.longitud_maxima < result.longitud_inicial
  ) {
    if (parametros.longitud_maxima === undefined) {
      result.longitud_maxima = Math.max(
        result.longitud_inicial,
        EXERCISE_PARAMETERS[categoria].longitud_maxima.default,
      );
    } else {
      errores.push(
        '"longitud_maxima" no puede ser menor que "longitud_inicial"',
      );
    }
  }
  return errores.length
    ? { ok: false, errores }
    : { ok: true, parametros: result };
}
