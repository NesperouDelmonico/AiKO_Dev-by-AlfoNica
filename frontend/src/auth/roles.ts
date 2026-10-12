import type { components } from '../api/schema'

export type Usuario = components['schemas']['Usuario']
export type Rol = components['schemas']['Rol']
export type PanelRole = 'especialista' | 'administrador'

export function normalizeRole(role: Rol | undefined): string {
  return role?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ?? ''
}

export function panelRole(role: Rol | undefined): PanelRole | null {
  const normalized = normalizeRole(role)
  if (normalized === 'especialista') return 'especialista'
  if (normalized === 'administrador') return 'administrador'
  return null
}

export function homeForRole(role: Rol | undefined): string | null {
  const panel = panelRole(role)
  return panel ? `/${panel}` : null
}
