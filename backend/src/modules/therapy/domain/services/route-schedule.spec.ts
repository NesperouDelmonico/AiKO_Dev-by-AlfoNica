import { RouteExerciseStatus } from '../entities/route-exercise.entity';
import { localDate, routeSchedule, ScheduleItem } from './route-schedule';

const done = (dia: number, iso: string): ScheduleItem => ({
  dia,
  estado: RouteExerciseStatus.COMPLETADO,
  fechaCompletado: new Date(iso),
});
const pending = (dia: number): ScheduleItem => ({
  dia,
  estado: RouteExerciseStatus.PENDIENTE,
  fechaCompletado: null,
});

describe('routeSchedule', () => {
  it('usa la fecha de Colombia (UTC-5)', () => {
    // 03:00 UTC del 19 = 22:00 del 18 en Bogotá.
    expect(localDate(new Date('2026-10-19T03:00:00Z'))).toBe('2026-10-18');
  });

  it('el primer día siempre está disponible', () => {
    expect(routeSchedule([pending(1), pending(2)])).toMatchObject({
      dia_actual: 1,
      disponible: true,
    });
  });

  it('el día 2 se habilita el día calendario siguiente', () => {
    const items = [done(1, '2026-10-18T20:00:00Z'), pending(2)];
    expect(
      routeSchedule(items, new Date('2026-10-19T03:00:00Z')),
    ).toMatchObject({
      dia_actual: 2,
      disponible: false,
      disponible_desde: '2026-10-19',
    });
    expect(
      routeSchedule(items, new Date('2026-10-19T05:30:00Z')),
    ).toMatchObject({
      dia_actual: 2,
      disponible: true,
      disponible_desde: null,
    });
  });

  it('un día ya empezado no se bloquea y la ruta completa se reporta', () => {
    expect(
      routeSchedule(
        [
          done(1, '2026-10-18T20:00:00Z'),
          done(2, '2026-10-19T15:00:00Z'),
          pending(2),
        ],
        new Date('2026-10-19T16:00:00Z'),
      ),
    ).toMatchObject({ dia_actual: 2, disponible: true });
    expect(routeSchedule([done(1, '2026-10-18T20:00:00Z')])).toMatchObject({
      completada: true,
    });
  });

  it('ignora los reemplazados', () => {
    expect(
      routeSchedule([
        {
          dia: 1,
          estado: RouteExerciseStatus.REEMPLAZADO,
          fechaCompletado: null,
        },
        pending(1),
      ]),
    ).toMatchObject({ dia_actual: 1, disponible: true });
  });
});
