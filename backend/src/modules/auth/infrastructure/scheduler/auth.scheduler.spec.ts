import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
import { AuthScheduler } from './auth.scheduler';

describe('AuthScheduler', () => {
  it('purges expired revoked sessions and password reset tokens', async () => {
    const repository = {
      purgeExpiredRevokedTokens: jest.fn().mockResolvedValue(2),
      purgeExpiredPasswordResets: jest.fn().mockResolvedValue(3),
    } as unknown as AuthRepositoryPort;
    const scheduler = new AuthScheduler(repository);

    await scheduler.purgeExpiredRevokedTokens();

    expect(repository.purgeExpiredRevokedTokens).toHaveBeenCalledTimes(1);
    expect(repository.purgeExpiredPasswordResets).toHaveBeenCalledTimes(1);
  });
});
