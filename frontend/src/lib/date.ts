// Campos sueltos que Intl no permite combinar con dateStyle/timeStyle.
const COMPONENT_KEYS = [
  'weekday', 'era', 'year', 'month', 'day', 'dayPeriod', 'hour', 'minute',
  'second', 'fractionalSecondDigits', 'timeZoneName',
] as const

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date
    ? value
    : /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00-05:00`)
      : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  // Intl lanza TypeError si se mezcla dateStyle con day/month/…; el estilo
  // por defecto solo aplica cuando no se piden campos sueltos.
  const usesComponents = COMPONENT_KEYS.some((key) => options?.[key] !== undefined)
  return new Intl.DateTimeFormat('es-CO', {
    ...(usesComponents ? {} : { dateStyle: 'medium' as const }),
    timeZone: 'America/Bogota',
    ...options,
  }).format(date)
}
