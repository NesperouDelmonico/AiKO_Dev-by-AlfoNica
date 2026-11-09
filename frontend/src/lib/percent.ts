/** Porcentaje redondeado al entero más cercano y acotado a 0–100. */
export function roundPercent(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function formatPercent(value: number | null | undefined): string {
  return `${roundPercent(value)}%`
}
