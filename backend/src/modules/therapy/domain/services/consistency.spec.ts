import { consistency, currentMonth } from './consistency';

/** Mediodía en Colombia (UTC-5) del día indicado. */
const at = (isoDate: string, hour = 12) =>
  new Date(`${isoDate}T${String(hour + 5).padStart(2, '0')}:00:00Z`);

describe('consistency', () => {
  const now = at('2026-10-28'); // miércoles

  it('cuenta la racha que termina hoy y la mejor racha', () => {
    const result = consistency(
      [
        at('2026-10-20'),
        at('2026-10-21'),
        at('2026-10-22'),
        at('2026-10-23'),
        at('2026-10-26'),
        at('2026-10-27'),
        at('2026-10-28'),
        at('2026-10-28', 15),
      ],
      '2026-10',
      now,
    );
    expect(result.racha_actual).toBe(3);
    expect(result.mejor_racha).toBe(4);
    expect(result.dias_activos).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
    ]);
    // Lunes 26 a domingo 1: cuatro intentos (dos hoy).
    expect(result.ejercicios_semana).toBe(4);
    expect(result.dias_activos_total).toBe(7);
    expect(result.hoy).toBe('2026-10-28');
  });

  it('la racha sigue viva si hoy aún no practica pero ayer sí', () => {
    const result = consistency(
      [at('2026-10-26'), at('2026-10-27')],
      '2026-10',
      now,
    );
    expect(result.racha_actual).toBe(2);
    expect(consistency([at('2026-10-25')], '2026-10', now).racha_actual).toBe(
      0,
    );
  });

  it('agrupa por fecha de Colombia y filtra el mes pedido', () => {
    // 23:30 del 30 de septiembre en Colombia = 04:30 UTC del 1 de octubre.
    const lateNight = new Date('2026-10-01T04:30:00Z');
    const result = consistency([lateNight, at('2026-10-02')], '2026-09', now);
    expect(result.dias_activos).toEqual(['2026-09-30']);
    expect(currentMonth(lateNight)).toBe('2026-09');
  });
});
