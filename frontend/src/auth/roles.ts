import type { components } from '../api/schema'

export type Usuario = components['schemas']['Usuario']
export type Rol = components['schemas']['Rol']
export type PanelRole = 'Especialista' | 'Administrador'

export const roleHomePaths: Partial<Record<Rol, string>> = {
  Administrador: '/admin',
  Especialista: '/especialista',
}

export function homeForRole(role: Rol | undefined): string | null {
  return role ? roleHomePaths[role] ?? null : null
}
