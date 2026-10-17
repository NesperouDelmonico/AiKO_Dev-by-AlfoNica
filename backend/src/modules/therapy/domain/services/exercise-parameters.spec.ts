import { CognitiveCategory } from '../entities/exercise.entity';
import { normalizeExerciseParameters } from './exercise-parameters';

describe('normalizeExerciseParameters', () => {
  it('completa valores por defecto', () => {
    expect(
      normalizeExerciseParameters(CognitiveCategory.ATENCION, {
        duracion_segundos: 90,
      }),
    ).toEqual({
      ok: true,
      parametros: { duracion_segundos: 90, intervalo_ms: 1500 },
    });
  });

  it('rechaza parámetros desconocidos, no enteros y fuera de rango', () => {
    const check = normalizeExerciseParameters(CognitiveCategory.VELOCIDAD, {
      intentos: 50,
      tiempo_limite_ms: 'rápido',
      duracion: 3,
    });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.errores).toHaveLength(3);
  });

  it('exige longitud_maxima >= longitud_inicial en Memoria', () => {
    expect(
      normalizeExerciseParameters(CognitiveCategory.MEMORIA, {
        longitud_inicial: 5,
        longitud_maxima: 4,
      }).ok,
    ).toBe(false);
    expect(
      normalizeExerciseParameters(CognitiveCategory.MEMORIA, {
        longitud_inicial: 8,
      }),
    ).toEqual({
      ok: true,
      parametros: {
        longitud_inicial: 8,
        longitud_maxima: 8,
        tiempo_visualizacion_ms: 1000,
      },
    });
  });
});
