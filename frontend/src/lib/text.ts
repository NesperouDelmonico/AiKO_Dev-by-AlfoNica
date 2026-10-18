export function initials(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—'
}

export function display(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}
