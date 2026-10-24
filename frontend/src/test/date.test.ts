import { describe, expect, it } from 'vitest'
import { formatDate } from '../lib/date'

describe('formatDate', () => {
  it('acepta campos sueltos sin mezclarlos con dateStyle', () => {
    expect(() => formatDate('2026-10-18', { day: '2-digit', month: 'short' })).not.toThrow()
    expect(formatDate('2026-10-18', { day: '2-digit', month: 'short' })).toMatch(/18/)
  })

  it('usa dateStyle por defecto y acepta dateStyle con timeStyle', () => {
    expect(formatDate('2026-10-18')).toMatch(/2026/)
    expect(() => formatDate('2026-10-18T20:45:00Z', { dateStyle: 'short', timeStyle: 'short' })).not.toThrow()
  })

  it('devuelve un guion para fechas inválidas', () => {
    expect(formatDate('no-es-fecha')).toBe('—')
  })
})
