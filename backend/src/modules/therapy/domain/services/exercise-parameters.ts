import {
  CATEGORY_BY_GAME_TYPE,
  GameType,
  RETIRED_GAME_TYPES,
} from '../entities/exercise.entity';

type Range = { min: number; max: number; default: number };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Una palabra: solo letras (incluidas tildes y ñ). */
const WORD = /^\p{L}+$/u;

/** Tamaños de cuadrícula permitidos en Busca la imagen. */
export const GRID_SIZES = [4, 6, 9, 12, 16];

/** Modos de respuesta de Recordar imágenes. */
export const RECALL_MODES = ['nombrar', 'relacionar'] as const;

/** Claves permitidas por tipo (para rechazar errores de escritura). */
const KEYS: Partial<Record<GameType, string[]>> = {
  [GameType.COMPLETAR_PALABRAS]: [
    'palabras',
    'frases',
    'imagen_id',
    'letras_faltantes',
    'intentos',
    'duracion_segundos',
  ],
  [GameType.LOGICA]: ['preguntas', 'duracion_segundos'],
  [GameType.RECORDAR_IMAGENES]: [
    'imagenes',
    'tiempo_visualizacion_segundos',
    'duracion_segundos',
    'modo',
    'dibujar',
  ],
  [GameType.MEMORIA_SECUENCIAS]: [
    'botones',
    'rondas',
    'intentos',
    'tiempo_respuesta_segundos',
  ],
  [GameType.TOQUE_COLOR]: [
    'rondas',
    'colores',
    'tiempo_limite_ms',
    'interferencia',
  ],
  [GameType.BUSCA_IMAGEN]: ['rondas', 'cuadricula', 'tiempo_limite_ms'],
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

  bool(value: unknown, label: string, fallback: boolean): boolean {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== 'boolean') {
      this.errores.push(`"${label}" debe ser verdadero o falso`);
      return fallback;
    }
    return value;
  }

  choice<T extends string>(
    value: unknown,
    label: string,
    options: readonly T[],
    fallback: T,
  ): T {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== 'string' || !options.includes(value as T)) {
      this.errores.push(`"${label}" debe ser uno de: ${options.join(', ')}`);
      return fallback;
    }
    return value as T;
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
    if (value === undefined || value === null) value = [];
    if (!Array.isArray(value)) {
      this.errores.push(`"${label}" debe ser una lista`);
      return [];
    }
    if (value.length < min || value.length > max) {
      this.errores.push(
        min === max
          ? `"${label}" debe tener ${min} elementos`
          : `"${label}" debe tener entre ${min} y ${max} elementos`,
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

const TOTAL_TIME = { min: 60, max: 900, default: 300 };

/** Completar palabras: palabras sueltas y luego frases (tipo scrabble). */
function completeWords(input: Record<string, unknown>, check: Checker) {
  const palabras = check
    .list(input.palabras, 'palabras', 1, 15)
    .map((raw, i) => {
      const word = check.text(raw, `palabras[${i}]`, 2, 15);
      if (word && !WORD.test(word)) {
        check.errores.push(
          `"palabras[${i}]" debe ser una sola palabra, solo con letras`,
        );
      }
      return word;
    });
  const frases = check.list(input.frases, 'frases', 0, 5).map((raw, i) => {
    const phrase = check.text(raw, `frases[${i}]`, 3, 120);
    const count = phrase.split(' ').filter(Boolean).length;
    if (phrase && (count < 2 || count > 12)) {
      check.errores.push(`"frases[${i}]" debe tener entre 2 y 12 palabras`);
    }
    return phrase;
  });
  return {
    palabras,
    frases,
    imagen_id: check.image(input.imagen_id, 'imagen_id', false),
    letras_faltantes: check.int(input.letras_faltantes, 'letras_faltantes', {
      min: 1,
      max: 4,
      default: 2,
    }),
    intentos: check.int(input.intentos, 'intentos', {
      min: 1,
      max: 10,
      default: 3,
    }),
    duracion_segundos: check.int(
      input.duracion_segundos,
      'duracion_segundos',
      TOTAL_TIME,
    ),
  };
}

/** Lógica matemática: preguntas tipo examen (A, B, C…). */
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
  return {
    preguntas,
    duracion_segundos: check.int(
      input.duracion_segundos,
      'duracion_segundos',
      TOTAL_TIME,
    ),
  };
}

/** Recordar imágenes: se memorizan, se ocultan, se nombran o ubican y se dibujan. */
function rememberImages(input: Record<string, unknown>, check: Checker) {
  const modo = check.choice(input.modo, 'modo', RECALL_MODES, 'nombrar');
  const imagenes = check
    .list(input.imagenes, 'imagenes', 2, 8)
    .map((raw, index) => {
      const item = check.object(raw, `imagenes[${index}]`);
      const respuestas = check
        .list(
          item.respuestas,
          `imagenes[${index}].respuestas`,
          modo === 'nombrar' ? 1 : 0,
          5,
        )
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
    modo,
    dibujar: check.bool(input.dibujar, 'dibujar', true),
    tiempo_visualizacion_segundos: check.int(
      input.tiempo_visualizacion_segundos,
      'tiempo_visualizacion_segundos',
      { min: 5, max: 30, default: 8 },
    ),
    duracion_segundos: check.int(
      input.duracion_segundos,
      'duracion_segundos',
      TOTAL_TIME,
    ),
  };
}

/** Secuencia de botones de colores (con una nota por botón). */
function colorSequence(input: Record<string, unknown>, check: Checker) {
  return {
    botones: check.int(input.botones, 'botones', {
      min: 3,
      max: 9,
      default: 4,
    }),
    rondas: check.int(input.rondas, 'rondas', { min: 3, max: 12, default: 6 }),
    intentos: check.int(input.intentos, 'intentos', {
      min: 1,
      max: 5,
      default: 3,
    }),
    tiempo_respuesta_segundos: check.int(
      input.tiempo_respuesta_segundos,
      'tiempo_respuesta_segundos',
      { min: 5, max: 60, default: 15 },
    ),
  };
}

/** Toque de color: tocar el botón del color que se nombra. */
function colorTap(input: Record<string, unknown>, check: Checker) {
  return {
    rondas: check.int(input.rondas, 'rondas', { min: 5, max: 40, default: 15 }),
    colores: check.int(input.colores, 'colores', {
      min: 3,
      max: 6,
      default: 4,
    }),
    tiempo_limite_ms: check.int(input.tiempo_limite_ms, 'tiempo_limite_ms', {
      min: 800,
      max: 5000,
      default: 2500,
    }),
    interferencia: check.bool(input.interferencia, 'interferencia', false),
  };
}

/** Busca la imagen: encontrar rápido la figura en una cuadrícula. */
function findImage(input: Record<string, unknown>, check: Checker) {
  const cuadricula = check.int(input.cuadricula, 'cuadricula', {
    min: 4,
    max: 16,
    default: 9,
  });
  if (!GRID_SIZES.includes(cuadricula)) {
    check.errores.push(
      `"cuadricula" debe ser uno de: ${GRID_SIZES.join(', ')}`,
    );
  }
  return {
    rondas: check.int(input.rondas, 'rondas', { min: 5, max: 30, default: 10 }),
    cuadricula,
    tiempo_limite_ms: check.int(input.tiempo_limite_ms, 'tiempo_limite_ms', {
      min: 1500,
      max: 15000,
      default: 6000,
    }),
  };
}

/**
 * Valida los parámetros según el tipo de juego, completa valores por
 * defecto y devuelve los ids de imágenes referenciadas para verificarlas.
 */
export function normalizeExerciseParameters(
  tipo: GameType,
  parametros: Record<string, unknown>,
): ParametersCheck {
  if (RETIRED_GAME_TYPES.includes(tipo) || !KEYS[tipo]) {
    return {
      ok: false,
      errores: [
        `El juego "${tipo}" ya no está disponible. Elige uno de: ${Object.keys(
          CATEGORY_BY_GAME_TYPE,
        ).join(', ')}`,
      ],
    };
  }
  const check = new Checker();
  const allowed = KEYS[tipo];
  for (const key of Object.keys(parametros)) {
    if (!allowed.includes(key)) {
      check.errores.push(
        `"${key}" no es un parámetro de ${tipo}. Permitidos: ${allowed.join(', ')}`,
      );
    }
  }

  let result: Record<string, unknown>;
  switch (tipo) {
    case GameType.COMPLETAR_PALABRAS:
      result = completeWords(parametros, check);
      break;
    case GameType.LOGICA:
      result = logic(parametros, check);
      break;
    case GameType.RECORDAR_IMAGENES:
      result = rememberImages(parametros, check);
      break;
    case GameType.MEMORIA_SECUENCIAS:
      result = colorSequence(parametros, check);
      break;
    case GameType.TOQUE_COLOR:
      result = colorTap(parametros, check);
      break;
    default:
      result = findImage(parametros, check);
  }

  return check.errores.length
    ? { ok: false, errores: check.errores }
    : { ok: true, parametros: result, imagenes: [...new Set(check.imagenes)] };
}
