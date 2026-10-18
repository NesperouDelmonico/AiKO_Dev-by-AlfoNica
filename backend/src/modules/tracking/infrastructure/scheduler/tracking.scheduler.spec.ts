import { ReminderFrequency } from '../../domain/entities/notification-preference.entity';
import { TrackingScheduler } from './tracking.scheduler';

describe('TrackingScheduler.sendConfiguredReminders', () => {
  // 13:05 UTC = 08:05 en America/Bogota (UTC-5, sin horario de verano).
  const NOW = new Date('2026-10-16T13:05:00Z');

  function build(horario: string, frecuencia = ReminderFrequency.DIARIA) {
    const repository = {
      preferences: jest.fn().mockResolvedValue([
        {
          pacienteId: 'p1',
          horarioRecordatorio: horario,
          frecuencia,
          paciente: { usuario: { correo: 'p@aiko.test' } },
        },
      ]),
      reminderSentSince: jest.fn().mockResolvedValue(false),
      createNotification: jest.fn().mockResolvedValue(undefined),
    };
    const email = { send: jest.fn().mockResolvedValue(undefined) };
    const push = { sendToPatient: jest.fn().mockResolvedValue(undefined) };
    const scheduler = new TrackingScheduler(repository as never, email, push);
    return { scheduler, repository, email, push };
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('con la ventana por defecto exige la misma hh:mm (comportamiento original)', async () => {
    const exact = build('08:05:00');
    await exact.scheduler.sendConfiguredReminders();
    expect(exact.repository.createNotification).toHaveBeenCalledTimes(1);

    const earlier = build('08:03:00');
    await earlier.scheduler.sendConfiguredReminders();
    expect(earlier.repository.createNotification).not.toHaveBeenCalled();
  });

  it('con ventana mayor envía lo programado dentro de esos minutos', async () => {
    const { scheduler, repository, push } = build('08:03:00');
    await scheduler.sendConfiguredReminders(5);
    expect(repository.createNotification).toHaveBeenCalledTimes(1);
    expect(push.sendToPatient).toHaveBeenCalledTimes(1);
  });

  it('no envía recordatorios futuros ni fuera de la ventana', async () => {
    const future = build('08:10:00');
    await future.scheduler.sendConfiguredReminders(5);
    expect(future.repository.createNotification).not.toHaveBeenCalled();

    const old = build('07:50:00');
    await old.scheduler.sendConfiguredReminders(5);
    expect(old.repository.createNotification).not.toHaveBeenCalled();
  });

  it('cruza la medianoche correctamente', async () => {
    jest.setSystemTime(new Date('2026-10-17T05:01:00Z')); // 00:01 Bogotá
    const { scheduler, repository } = build('23:59:00');
    await scheduler.sendConfiguredReminders(5);
    expect(repository.createNotification).toHaveBeenCalledTimes(1);
  });

  it('respeta el filtro de duplicados', async () => {
    const { scheduler, repository } = build('08:05:00');
    repository.reminderSentSince.mockResolvedValue(true);
    await scheduler.sendConfiguredReminders(5);
    expect(repository.createNotification).not.toHaveBeenCalled();
  });
});
