function bogotaDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

export function ageInBogota(isoDate: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const [year, month, day] = isoDate.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return null
  const dob = new Date(Date.UTC(year, month - 1, day))
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() + 1 !== month || dob.getUTCDate() !== day) return null
  const today = bogotaDateParts(now)
  let age = today.year - year
  if (today.month < month || (today.month === month && today.day < day)) age -= 1
  return age
}

export function todayInBogota(now = new Date()): string {
  const { year, month, day } = bogotaDateParts(now)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
