import { GameType } from '../entities/exercise.entity';
import { normalizeExerciseParameters } from './exercise-parameters';

const IMG = '6b3f0f1e-6a4b-4c1e-9b2a-1d2e3f4a5b6c';
const IMG2 = '7c4a1a2f-7b5c-4d2f-8c3b-2e3f4a5b6c7d';

const ok = (tipo: GameType, params: Record<string, unknown>) => {
  const result = normalizeExerciseParameters(tipo, params);
  if (!result.ok) throw new Error(result.errores.join('; '));
  return result;
};
const errors = (tipo: GameType, params: Record<string, unknown>) => {
  const result = normalizeExerciseParameters(tipo, params);
  return result.ok ? [] : result.errores;
};

describe('normalizeExerciseParameters', () => {
  it('rechaza juegos retirados y claves desconocidas', () => {
    expect(errors(GameType.REACCION, {})[0]).toMatch(/ya no está disponible/);
    expect(errors(GameType.ATENCION_SOSTENIDA, {})[0]).toMatch(
      /ya no está disponible/,
    );
    expect(errors(GameType.TOQUE_COLOR, { velocidad: 3 })[0]).toMatch(
      /no es un parámetro/,
    );
  });

  describe('completar_palabras', () => {
    it('escala de palabras a frases con todos los parámetros', () => {
      const result = ok(GameType.COMPLETAR_PALABRAS, {
        palabras: [' gato ', 'Ñandú'],
        frases: ['El  gato duerme'],
        intentos: 5,
        imagen_id: IMG,
      });
      expect(result.parametros).toEqual({
        palabras: ['gato', 'Ñandú'],
        frases: ['El gato duerme'],
        imagen_id: IMG,
        letras_faltantes: 2,
        intentos: 5,
        duracion_segundos: 300,
      });
      expect(result.imagenes).toEqual([IMG]);
    });

    it('rechaza palabras con espacios o números y frases de una palabra', () => {
      expect(
        errors(GameType.COMPLETAR_PALABRAS, { palabras: ['dos gatos'] }).join(),
      ).toMatch(/una sola palabra/);
      expect(
        errors(GameType.COMPLETAR_PALABRAS, { palabras: ['gato1'] }).join(),
      ).toMatch(/solo con letras/);
      expect(
        errors(GameType.COMPLETAR_PALABRAS, {
          palabras: ['gato'],
          frases: ['hola'],
        }).join(),
      ).toMatch(/entre 2 y 12 palabras/);
      expect(
        errors(GameType.COMPLETAR_PALABRAS, { palabras: [] }).join(),
      ).toMatch(/entre 1 y 15/);
      expect(
        errors(GameType.COMPLETAR_PALABRAS, {
          palabras: ['gato'],
          intentos: 0,
        }).join(),
      ).toMatch(/intentos/);
    });
  });

  describe('logica', () => {
    it('acepta preguntas tipo examen con tiempo total', () => {
      const result = ok(GameType.LOGICA, {
        preguntas: [
          {
            enunciado: '¿Cuánto es 2 + 2?',
            opciones: ['3', '4', '5'],
            correcta: 1,
          },
        ],
      });
      expect(result.parametros).toMatchObject({ duracion_segundos: 300 });
    });

    it('rechaza respuesta correcta fuera de las opciones u opciones repetidas', () => {
      expect(
        errors(GameType.LOGICA, {
          preguntas: [
            { enunciado: '¿2 + 2?', opciones: ['4', '4'], correcta: 0 },
          ],
        }).join(),
      ).toMatch(/repetir/);
      expect(
        errors(GameType.LOGICA, {
          preguntas: [
            {
              enunciado: '¿Cuánto es 2 + 2?',
              opciones: ['3', '4'],
              correcta: 5,
            },
          ],
        }).join(),
      ).toMatch(/correcta/);
    });
  });

  describe('recordar_imagenes', () => {
    it('acepta modo nombrar con palabras clave y dibujo por defecto', () => {
      const result = ok(GameType.RECORDAR_IMAGENES, {
        imagenes: [
          { imagen_id: IMG, respuestas: ['perro'] },
          { imagen_id: IMG2, respuestas: ['gato', 'michi'] },
        ],
      });
      expect(result.parametros).toMatchObject({
        modo: 'nombrar',
        dibujar: true,
        tiempo_visualizacion_segundos: 8,
        duracion_segundos: 300,
      });
      expect(result.imagenes).toEqual([IMG, IMG2]);
    });

    it('en modo relacionar las palabras clave son opcionales', () => {
      expect(
        errors(GameType.RECORDAR_IMAGENES, {
          modo: 'relacionar',
          imagenes: [{ imagen_id: IMG }, { imagen_id: IMG2 }],
        }),
      ).toEqual([]);
      expect(
        errors(GameType.RECORDAR_IMAGENES, {
          imagenes: [{ imagen_id: IMG }, { imagen_id: IMG2 }],
        }).join(),
      ).toMatch(/respuestas/);
    });

    it('exige al menos dos imágenes y un tiempo visible de 5 a 30 s', () => {
      expect(
        errors(GameType.RECORDAR_IMAGENES, {
          imagenes: [{ imagen_id: IMG, respuestas: ['a'] }],
        }).join(),
      ).toMatch(/entre 2 y 8/);
      expect(
        errors(GameType.RECORDAR_IMAGENES, {
          imagenes: [
            { imagen_id: IMG, respuestas: ['a'] },
            { imagen_id: IMG2, respuestas: ['b'] },
          ],
          tiempo_visualizacion_segundos: 3,
        }).join(),
      ).toMatch(/entre 5 y 30/);
      expect(
        errors(GameType.RECORDAR_IMAGENES, {
          modo: 'cantar',
          imagenes: [],
        }).join(),
      ).toMatch(/modo/);
    });
  });

  it('secuencia de colores: botones, rondas, intentos y tiempo por ronda', () => {
    expect(ok(GameType.MEMORIA_SECUENCIAS, { botones: 6 }).parametros).toEqual({
      botones: 6,
      rondas: 6,
      intentos: 3,
      tiempo_respuesta_segundos: 15,
    });
    expect(errors(GameType.MEMORIA_SECUENCIAS, { botones: 12 }).join()).toMatch(
      /entre 3 y 9/,
    );
  });

  it('toque de color y busca la imagen completan valores por defecto', () => {
    expect(
      ok(GameType.TOQUE_COLOR, { interferencia: true }).parametros,
    ).toEqual({
      rondas: 15,
      colores: 4,
      tiempo_limite_ms: 2500,
      interferencia: true,
    });
    expect(ok(GameType.BUSCA_IMAGEN, {}).parametros).toEqual({
      rondas: 10,
      cuadricula: 9,
      tiempo_limite_ms: 6000,
    });
    expect(errors(GameType.BUSCA_IMAGEN, { cuadricula: 5 }).join()).toMatch(
      /4, 6, 9, 12, 16/,
    );
    expect(
      errors(GameType.TOQUE_COLOR, { interferencia: 'si' }).join(),
    ).toMatch(/verdadero o falso/);
  });
});
