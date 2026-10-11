type CalendarDate = { year: number; month: number; day: number };

function bogotaToday(now: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function birthDateParts(value: string): CalendarDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth ? { year, month, day } : null;
}

export function ageInBogota(
  fechaNacimiento: string | null | undefined,
  now = new Date(),
): number | null {
  if (!fechaNacimiento) return null;
  const birth = birthDateParts(fechaNacimiento);
  if (!birth) return null;
  const today = bogotaToday(now);
  let age = today.year - birth.year;
  if (
    birth.month > today.month ||
    (birth.month === today.month && birth.day > today.day)
  ) {
    age -= 1;
  }
  return age;
}

export function isValidBirthDate(value: unknown, now = new Date()): boolean {
  if (typeof value !== 'string') return false;
  const birth = birthDateParts(value);
  if (!birth) return false;
  const today = bogotaToday(now);
  const isFuture =
    birth.year > today.year ||
    (birth.year === today.year && birth.month > today.month) ||
    (birth.year === today.year &&
      birth.month === today.month &&
      birth.day > today.day);
  const age = ageInBogota(value, now);
  return !isFuture && age !== null && age <= 120;
}
