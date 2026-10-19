import { validate } from 'class-validator';
import { CreateIncidentDto } from './incident.dto';

describe('CreateIncidentDto', () => {
  it('requires incident descriptions to contain at least ten characters', async () => {
    const tooShort = Object.assign(new CreateIncidentDto(), {
      descripcion: '123456789',
    });
    const valid = Object.assign(new CreateIncidentDto(), {
      descripcion: '1234567890',
    });

    await expect(validate(tooShort)).resolves.not.toHaveLength(0);
    await expect(validate(valid)).resolves.toHaveLength(0);
  });
});
