import { ageInBogota, isValidBirthDate } from './patient-birth-date';

describe('patient birth date', () => {
  const beforeBogotaMidnight = new Date('2026-10-11T04:30:00.000Z');

  it('uses the current calendar date in America/Bogota to calculate age', () => {
    expect(ageInBogota('2000-10-11', beforeBogotaMidnight)).toBe(25);
    expect(
      ageInBogota('2000-10-11', new Date('2026-10-11T05:30:00.000Z')),
    ).toBe(26);
  });

  it('allows ages outside 30-60 through 120 and rejects future, invalid, or older dates', () => {
    expect(isValidBirthDate('2008-06-15', beforeBogotaMidnight)).toBe(true);
    expect(isValidBirthDate('1906-10-10', beforeBogotaMidnight)).toBe(true);
    expect(isValidBirthDate('1905-10-10', beforeBogotaMidnight)).toBe(false);
    expect(isValidBirthDate('2026-10-11', beforeBogotaMidnight)).toBe(false);
    expect(isValidBirthDate('2024-02-30', beforeBogotaMidnight)).toBe(false);
  });
});
