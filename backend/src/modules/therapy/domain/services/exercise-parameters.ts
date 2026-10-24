import { GameType } from '../entities/exercise.entity';

type Range = { min: number; max: number; default: number };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parámetros numéricos de los juegos simples (con valor por defecto). */
const NUMERIC: Partial<Record<GameType, Record<string, Range>>> = {
  [GameType.ATENCION_SOSTENIDA]: {
    duracion_segundos: { min: 30, max: 180, default: 60 },
    intervalo_ms: { min: 600, max: 3000, default: 1500 },
  },
  [GameType.MEMORIA_SECUENCIAS]: {
    longitud_inicial: { min: 2, max: 8, default: 3 },
    longitud_maxima: { min: 2, max: 9, default: 6 },
    tiempo_visualizacion_ms: { min: 500, max: 3000, default: 1000 },
  },
  [GameType.REACCION]: {
    intentos: { min: 5, max: 30, default: 10 },
    tiempo_limite_ms: { min: 300, max: 3000, default: 1500 },
  },
};

/** Claves permitidas por tipo (para rechazar errores de escritura). */
const KEYS: Record<GameType, string[]> = {
  [GameType.ATENCION_SOSTENIDA]: Object.keys(
    NUMERIC[GameType.ATENCION_SOSTENIDA]!,
  ),
  [GameType.MEMORIA_SECUENCIAS]: Object.keys(
    NUMERIC[GameType.MEMORIA_SECUENCIAS]!,
  ),
  [GameType.REACCION]: Object.keys(NUMERIC[GameType.REACCION]!),
  [GameType.COMPLETAR_PALABRAS]: [
    'frase',
    'imagen_id',
    'letras_ocultas',
    'duracion_segundos',
  ],
  [GameType.RECORDAR_IMAGENES]: ['imagenes', 'tiempo_visualizacion_segundos'],
  [GameType.LOGICA]: ['preguntas'],
};

export type ParametersCheck =
  | { ok: true; parametros: Record<string, unknown>; imagenes: string[] }
  | { ok: false; errores: string[] };

class Checker {
  readonly errores: string[] = [];
  readonly imagenes: string[] = [];

  int(value: unknown, label: string, range: Range): number {
    if (value === undefined || value === null) return range.default;
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      this.errores.push(`"${label}" debe ser un número entero`);
      return range.default;
    }
    if (value < range.min || value > range.max) {
      this.errores.push(
        `"${label}" debe estar entre ${range.min} y ${range.max}`,
      );
    }
    return value;
  }

  text(value: unknown, label: string, min: number, max: number): string {
    if (typeof value !== 'string') {
      this.errores.push(`"${label}" debe ser un texto`);
      return '';
    }
    const text = value.trim().replace(/\s+/g, ' ');
    if (text.length < min || text.length > max) {
      this.errores.push(
        `"${label}" debe tener entre ${min} y ${max} caracteres`,
      );
    }
    return text;
  }

  image(value: unknown, label: string, required: boolean): string | null {
    if (value === undefined || value === null || value === '') {
      if (required) this.errores.push(`"${label}" es obligatoria`);
      return null;
    }
    if (typeof value !== 'string' || !UUID.test(value)) {
      this.errores.push(`"${label}" debe ser el id de una imagen subida`);
      return null;
    }
    this.imagenes.push(value);
    return value;
  }

  list(value: unknown, label: string, min: number, max: number): unknown[] {
    if (!Array.isArray(value)) {
      this.errores.push(`"${label}" debe ser una lista`);
      return [];
    }
    if (value.length < min || value.length > max) {
      this.errores.push(
        `"${label}" debe tener entre ${min} y ${max} elementos`,
      );
    }
    return value.slice(0, max);
  }

  object(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.errores.push(`"${label}" debe ser un objeto`);
      return {};
    }
    return value as Record<string, unknown>;
  }
}

function numeric(
  schema: Record<string, Range>,
  input: Record<string, unknown>,
  check: Checker,
) {
  const result: Record<string, number> = {};
  for (const [key, range] of Object.entries(schema)) {
    result[key] = check.int(input[key], key, range);
  }
  return result;
}

function completeWords(input: Record<string, unknown>, check: Checker) {
  const frase = check.text(input.frase, 'frase', 2, 120);
  const words = frase.split(' ').filter(Boolean);
  if (words.length > 12) {
    check.errores.push('"frase" puede tener máximo 12 palabras');
  }
  return {
    frase,
    imagen_id: check.image(input.imagen_id, 'imagen_id', false),
    letras_ocultas: check.int(input.letras_ocultas, 'letras_ocultas', {
      min: 1,
      max: 4,
      default: 2,
    }),
    duracion_segundos: check.int(input.duracion_segundos, 'duracion_segundos', {
      min: 60,
      max: 600,
      default: 300,
    }),
  };
}

function rememberImages(input: Record<string, unknown>, check: Checker) {
  const imagenes = check
    .list(input.imagenes, 'imagenes', 1, 6)
    .map((raw, index) => {
      const item = check.object(raw, `imagenes[${index}]`);
      const respuestas = check
        .list(item.respuestas, `imagenes[${index}].respuestas`, 1, 5)
        .map((answer, j) =>
          check.text(answer, `imagenes[${index}].respuestas[${j}]`, 1, 40),
        );
      return {
        imagen_id: check.image(
          item.imagen_id,
          `imagenes[${index}].imagen_id`,
          true,
        ),
        respuestas,
      };
    });
  return {
    imagenes,
    tiempo_visualizacion_segundos: check.int(
      input.tiempo_visualizacion_segundos,
      'tiempo_visualizacion_segundos',
      { min: 3, max: 30, default: 8 },
    ),
  };
}

function logic(input: Record<string, unknown>, check: Checker) {
  const preguntas = check
    .list(input.preguntas, 'preguntas', 1, 10)
    .map((raw, index) => {
      const label = `preguntas[${index}]`;
      const item = check.object(raw, label);
      const opciones = check
        .list(item.opciones, `${label}.opciones`, 2, 6)
        .map((option, j) =>
          check.text(option, `${label}.opciones[${j}]`, 1, 80),
        );
      const unique = new Set(opciones.map((o) => o.toLocaleLowerCase('es')));
      if (unique.size !== opciones.length) {
        check.errores.push(`"${label}.opciones" no puede repetir respuestas`);
      }
      const correcta = check.int(item.correcta, `${label}.correcta`, {
        min: 0,
        max: Math.max(0, opciones.length - 1),
        default: -1,
      });
      if (correcta < 0) {
        check.errores.push(`"${label}.correcta" es obligatoria`);
      }
      return {
        enunciado: check.text(item.enunciado, `${label}.enunciado`, 5, 600),
        imagen_id: check.image(item.imagen_id, `${label}.imagen_id`, false),
        opciones,
        correcta,
      };
    });
  return { preguntas };
}

/**
 * Valida los parámetros según el tipo de juego, completa valores por
 * defecto y devuelve los ids de imágenes referenciadas para verificarlas.
 */
export function normalizeExerciseParameters(
  tipo: GameType,
  parametros: Record<string, unknown>,
): ParametersCheck {
  const check = new Checker();
  for (const key of Object.keys(parametros)) {
    if (!KEYS[tipo].includes(key)) {
      check.errores.push(
        `"${key}" no es un parámetro de ${tipo}. Permitidos: ${KEYS[tipo].join(', ')}`,
      );
    }
  }

  let result: Record<string, unknown>;
  switch (tipo) {
    case GameType.COMPLETAR_PALABRAS:
      result = completeWords(parametros, check);
      break;
    case GameType.RECORDAR_IMAGENES:
      result = rememberImages(parametros, check);
      break;
    case GameType.LOGICA:
      result = logic(parametros, check);
      break;
    default:
      result = numeric(NUMERIC[tipo]!, parametros, check);
  }

  if (tipo === GameType.MEMORIA_SECUENCIAS && !check.errores.length) {
    const r = result as Record<string, number>;
    if (r.longitud_maxima < r.longitud_inicial) {
      if (parametros.longitud_maxima === undefined) {
        r.longitud_maxima = Math.max(r.longitud_inicial, 6);
      } else {
        check.errores.push(
          '"longitud_maxima" no puede ser menor que "longitud_inicial"',
        );
      }
    }
  }

  return check.errores.length
    ? { ok: false, errores: check.errores }
    : { ok: true, parametros: result, imagenes: [...new Set(check.imagenes)] };
}
