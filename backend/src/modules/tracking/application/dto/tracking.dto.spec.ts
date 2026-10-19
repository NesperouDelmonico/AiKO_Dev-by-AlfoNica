import { validate } from 'class-validator';
import { ObservationDto } from './tracking.dto';

describe('ObservationDto', () => {
  it('requires observation text to contain at least five characters', async () => {
    const tooShort = Object.assign(new ObservationDto(), { texto: '1234' });
    const valid = Object.assign(new ObservationDto(), { texto: '12345' });

    await expect(validate(tooShort)).resolves.not.toHaveLength(0);
    await expect(validate(valid)).resolves.toHaveLength(0);
  });
});
