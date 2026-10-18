import { Not, Repository } from 'typeorm';
import { PostgresTherapyRepository } from './postgres-therapy.repository';
import { ExerciseEntity } from '../../domain/entities/exercise.entity';
import {
  RouteExerciseEntity,
  RouteExerciseStatus,
} from '../../domain/entities/route-exercise.entity';
import {
  RouteStatus,
  TherapeuticRouteEntity,
} from '../../domain/entities/therapeutic-route.entity';
import { ExerciseResultEntity } from '../../domain/entities/exercise-result.entity';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { SpecialistEntity } from '../../../users/domain/entities/specialist.entity';

describe('PostgresTherapyRepository route ordering', () => {
  const transactionManager = {
    transaction: jest.fn(),
    findOneOrFail: jest.fn(),
    findOne: jest.fn(),
    findOneByOrFail: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    create: jest.fn((_entity: unknown, values: object) => ({ ...values })),
    save: jest.fn(async (_entity: unknown, value: object) => value),
    update: jest.fn(),
  };
  const routes = {
    manager: transactionManager,
  } as unknown as Repository<TherapeuticRouteEntity>;
  const items = {
    count: jest.fn(),
  };
  const repository = new PostgresTherapyRepository(
    {} as Repository<ExerciseEntity>,
    routes,
    items as unknown as Repository<RouteExerciseEntity>,
    {} as Repository<ExerciseResultEntity>,
    {} as Repository<PatientEntity>,
    {} as Repository<SpecialistEntity>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    transactionManager.transaction.mockImplementation(async (work) =>
      (work as (manager: typeof transactionManager) => Promise<unknown>)(
        transactionManager,
      ),
    );
  });

  it('excludes Reemplazado while determining the next order number', async () => {
    items.count.mockResolvedValue(1);

    await expect(repository.routeExerciseCount('route-id')).resolves.toBe(1);

    expect(items.count).toHaveBeenCalledWith({
      where: {
        ruta: { id: 'route-id' },
        estado: Not(RouteExerciseStatus.REEMPLAZADO),
      },
    });
  });

  it('accepts the next active order after replaced rows are excluded', async () => {
    transactionManager.findOneOrFail.mockResolvedValue({
      id: 'route-id',
      estado: RouteStatus.ACTIVA,
    });
    transactionManager.count.mockResolvedValue(1);
    transactionManager.findOneByOrFail.mockResolvedValue({
      id: 'exercise-id',
    });

    await repository.addRouteExercise('route-id', 'exercise-id', 2);

    expect(transactionManager.count).toHaveBeenCalledWith(
      RouteExerciseEntity,
      expect.objectContaining({
        where: {
          ruta: { id: 'route-id' },
          estado: Not(RouteExerciseStatus.REEMPLAZADO),
        },
      }),
    );
    expect(transactionManager.save).toHaveBeenCalledWith(
      RouteExerciseEntity,
      expect.objectContaining({
        orden: 2,
        estado: RouteExerciseStatus.PENDIENTE,
      }),
    );
  });

  it('replaces an item transactionally and inserts its replacement at the same order', async () => {
    const oldItem = Object.assign(new RouteExerciseEntity(), {
      id: 'old-item',
      ruta: { id: 'route-id' },
      orden: 2,
      estado: RouteExerciseStatus.PENDIENTE,
    });
    transactionManager.findOne.mockResolvedValue(oldItem);
    transactionManager.findOneOrFail
      .mockResolvedValueOnce({
        id: 'route-id',
        estado: RouteStatus.ACTIVA,
      })
      .mockResolvedValueOnce(oldItem)
      .mockResolvedValueOnce({ id: 'replacement-exercise' });

    const replacement = await repository.replaceRouteExercise(
      'old-item',
      'replacement-exercise',
    );

    expect(transactionManager.transaction).toHaveBeenCalledTimes(1);
    expect(transactionManager.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'old-item',
        estado: RouteExerciseStatus.REEMPLAZADO,
      }),
    );
    expect(transactionManager.save).toHaveBeenNthCalledWith(
      2,
      RouteExerciseEntity,
      expect.objectContaining({
        ruta: expect.objectContaining({ id: 'route-id' }),
        ejercicio: expect.objectContaining({ id: 'replacement-exercise' }),
        orden: 2,
        estado: RouteExerciseStatus.PENDIENTE,
      }),
    );
    expect(replacement).toMatchObject({ orden: 2 });
  });

  it('resequence reads only current route items and renumbers without transient unique collisions', async () => {
    transactionManager.findOneOrFail.mockResolvedValue({
      id: 'route-id',
      estado: RouteStatus.ACTIVA,
    });
    transactionManager.find.mockResolvedValue([
      { id: 'first', orden: 3 },
      { id: 'second', orden: 8 },
    ]);

    await repository.resequenceRoute('route-id');

    expect(transactionManager.find).toHaveBeenCalledWith(RouteExerciseEntity, {
      where: {
        ruta: { id: 'route-id' },
        estado: Not(RouteExerciseStatus.REEMPLAZADO),
      },
      order: { orden: 'ASC', id: 'ASC' },
    });
    expect(transactionManager.update).toHaveBeenNthCalledWith(
      1,
      RouteExerciseEntity,
      'first',
      { orden: 9 },
    );
    expect(transactionManager.update).toHaveBeenNthCalledWith(
      2,
      RouteExerciseEntity,
      'second',
      { orden: 10 },
    );
    expect(transactionManager.update).toHaveBeenNthCalledWith(
      3,
      RouteExerciseEntity,
      'first',
      { orden: 1 },
    );
    expect(transactionManager.update).toHaveBeenNthCalledWith(
      4,
      RouteExerciseEntity,
      'second',
      { orden: 2 },
    );
  });

  describe('removeRouteExercise', () => {
    const route = { id: 'route-id', estado: RouteStatus.ACTIVA };
    const pending = () =>
      Object.assign(new RouteExerciseEntity(), {
        id: 'item-id',
        ruta: { id: 'route-id' },
        orden: 1,
        estado: RouteExerciseStatus.PENDIENTE,
      });

    beforeEach(() => {
      transactionManager.findOne.mockResolvedValue(pending());
      transactionManager.findOneOrFail
        .mockResolvedValueOnce(route)
        .mockResolvedValueOnce(pending());
      transactionManager.find.mockResolvedValue([]);
      Object.assign(transactionManager, { delete: jest.fn() });
    });

    it('no pide relaciones en las consultas con bloqueo', async () => {
      transactionManager.count.mockResolvedValue(0);
      await repository.removeRouteExercise('item-id');
      for (const [, options] of transactionManager.findOneOrFail.mock.calls as [
        unknown,
        { lock?: unknown; relations?: unknown },
      ][]) {
        if (options.lock) expect(options.relations).toBeUndefined();
      }
      expect(
        (transactionManager as unknown as { delete: jest.Mock }).delete,
      ).toHaveBeenCalledWith(RouteExerciseEntity, { id: 'item-id' });
    });

    it('si ya tuvo intentos lo retira como Reemplazado en vez de borrarlo', async () => {
      transactionManager.count.mockResolvedValue(2);
      await repository.removeRouteExercise('item-id');
      expect(
        (transactionManager as unknown as { delete: jest.Mock }).delete,
      ).not.toHaveBeenCalled();
      expect(transactionManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'item-id',
          estado: RouteExerciseStatus.REEMPLAZADO,
        }),
      );
    });
  });
});
