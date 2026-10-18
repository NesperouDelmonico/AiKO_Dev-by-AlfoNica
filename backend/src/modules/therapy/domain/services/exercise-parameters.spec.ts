import { GameType } from '../entities/exercise.entity';
import { normalizeExerciseParameters } from './exercise-parameters';

const IMG = '6b3f0f1e-6a4b-4c1e-9b2a-1d2e3f4a5b6c';
const IMG2 = '7c4a1a2f-7b5c-4d2f-8c3b-2e3f4a5b6c7d';

describe('normalizeExerciseParameters', () => {
  it('completa valores por defecto en juegos numéricos', () => {
    expect(
      normalizeExerciseParameters(GameType.ATENCION_SOSTENIDA, {
        duracion_segundos: 90,
      }),
    ).toEqual({
      ok: true,
      parametros: { duracion_segundos: 90, intervalo_ms: 1500 },
      imagenes: [],
    });
  });

  it('rechaza parámetros desconocidos, no enteros y fuera de rango', () => {
    const check = normalizeExerciseParameters(GameType.REACCION, {
      intentos: 50,
      tiempo_limite_ms: 'rápido',
      duracion: 3,
    });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.errores).toHaveLength(3);
  });

  it('exige longitud_maxima >= longitud_inicial en secuencias', () => {
    expect(
      normalizeExerciseParameters(GameType.MEMORIA_SECUENCIAS, {
        longitud_inicial: 5,
        longitud_maxima: 4,
      }).ok,
    ).toBe(false);
    expect(
      normalizeExerciseParameters(GameType.MEMORIA_SECUENCIAS, {
        longitud_inicial: 8,
      }),
    ).toMatchObject({ ok: true, parametros: { longitud_maxima: 8 } });
  });

  describe('completar_palabras', () => {
    it('normaliza la frase y devuelve la imagen usada', () => {
      expect(
        normalizeExerciseParameters(GameType.COMPLETAR_PALABRAS, {
          frase: '  El gato   duerme ',
          imagen_id: IMG,
        }),
      ).toEqual({
        ok: true,
        parametros: {
          frase: 'El gato duerme',
          imagen_id: IMG,
          letras_ocultas: 2,
          duracion_segundos: 300,
        },
        imagenes: [IMG],
      });
    });

    it('rechaza frases vacías, de más de 12 palabras o imagen inválida', () => {
      expect(
        normalizeExerciseParameters(GameType.COMPLETAR_PALABRAS, { frase: '' })
          .ok,
      ).toBe(false);
      expect(
        normalizeExerciseParameters(GameType.COMPLETAR_PALABRAS, {
          frase: 'a b c d e f g h i j k l m',
        }).ok,
      ).toBe(false);
      expect(
        normalizeExerciseParameters(GameType.COMPLETAR_PALABRAS, {
          frase: 'Hola',
          imagen_id: 'foto.png',
        }).ok,
      ).toBe(false);
    });
  });

  describe('recordar_imagenes', () => {
    it('acepta imágenes con palabras clave', () => {
      expect(
        normalizeExerciseParameters(GameType.RECORDAR_IMAGENES, {
          imagenes: [
            { imagen_id: IMG, respuestas: ['perro', ' cachorro '] },
            { imagen_id: IMG2, respuestas: ['casa'] },
          ],
          tiempo_visualizacion_segundos: 10,
        }),
      ).toEqual({
        ok: true,
        parametros: {
          imagenes: [
            { imagen_id: IMG, respuestas: ['perro', 'cachorro'] },
            { imagen_id: IMG2, respuestas: ['casa'] },
          ],
          tiempo_visualizacion_segundos: 10,
        },
        imagenes: [IMG, IMG2],
      });
    });

    it('exige imagen y al menos una respuesta por tarjeta', () => {
      const check = normalizeExerciseParameters(GameType.RECORDAR_IMAGENES, {
        imagenes: [{ respuestas: [] }],
      });
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.errores.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('logica', () => {
    const pregunta = {
      enunciado: 'Ana tiene 3 manzanas y compra 2. ¿Cuántas tiene?',
      opciones: ['4', '5', '6'],
      correcta: 1,
    };

    it('acepta preguntas con opciones y respuesta correcta', () => {
      expect(
        normalizeExerciseParameters(GameType.LOGICA, { preguntas: [pregunta] }),
      ).toEqual({
        ok: true,
        parametros: { preguntas: [{ ...pregunta, imagen_id: null }] },
        imagenes: [],
      });
    });

    it('rechaza respuesta correcta fuera de las opciones u opciones repetidas', () => {
      expect(
        normalizeExerciseParameters(GameType.LOGICA, {
          preguntas: [{ ...pregunta, correcta: 3 }],
        }).ok,
      ).toBe(false);
      expect(
        normalizeExerciseParameters(GameType.LOGICA, {
          preguntas: [{ ...pregunta, opciones: ['5', '5'] }],
        }).ok,
      ).toBe(false);
      expect(
        normalizeExerciseParameters(GameType.LOGICA, {
          preguntas: [{ enunciado: pregunta.enunciado, opciones: ['1', '2'] }],
        }).ok,
      ).toBe(false);
    });
  });
});
