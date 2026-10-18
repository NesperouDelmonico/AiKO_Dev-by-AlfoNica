import { withSnakeCaseAliases } from './snake-case-alias.interceptor';

class Exercise {
  nivelDificultad = 2;
  fechaCreacion = new Date('2026-10-18T00:00:00Z');
  nombre = 'Reacción';
}

describe('withSnakeCaseAliases', () => {
  it('agrega alias snake_case anidados y conserva las claves originales', () => {
    const result = withSnakeCaseAliases({
      data: [{ xpGanado: 8, rutaEjercicio: { ejercicio: new Exercise() } }],
      total: 1,
    }) as {
      data: {
        xpGanado: number;
        xp_ganado: number;
        ruta_ejercicio: { ejercicio: Record<string, unknown> };
      }[];
    };
    const item = result.data[0];
    expect(item.xpGanado).toBe(8);
    expect(item.xp_ganado).toBe(8);
    expect(item.ruta_ejercicio.ejercicio).toMatchObject({
      nivelDificultad: 2,
      nivel_dificultad: 2,
      nombre: 'Reacción',
    });
    expect(item.ruta_ejercicio.ejercicio.fecha_creacion).toBeInstanceOf(Date);
  });

  it('no pisa una clave snake_case que ya existe', () => {
    expect(withSnakeCaseAliases({ xpTotal: 1, xp_total: 5 })).toEqual({
      xpTotal: 1,
      xp_total: 5,
    });
  });

  it('deja intactos valores primitivos y null', () => {
    expect(withSnakeCaseAliases(null)).toBeNull();
    expect(withSnakeCaseAliases('texto')).toBe('texto');
  });
});
