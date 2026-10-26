import { apiClient } from '../../api/client'
import { requireResponse, requireSuccess } from '../../api/client'
import type { components } from '../../api/schema'

export type User = components['schemas']['Usuario']
export type UserList = components['schemas']['PaginatedMeta'] & { data?: User[] }
export type UserFilters = { page: number; limit: number; q?: string; rol?: components['schemas']['Rol']; estado?: boolean }

export async function getUsers(filters: UserFilters): Promise<UserList> {
  const result = await apiClient.GET('/usuarios', { params: { query: filters } })
  return requireResponse(result.data, result.response)
}

export async function getUser(id: string): Promise<User> {
  const result = await apiClient.GET('/usuarios/{id}', { params: { path: { id } } })
  return requireResponse(result.data, result.response)
}

export async function createAccount(role: 'Especialista' | 'Administrador', body: { nombre: string; cedula: string; correo: string }): Promise<User> {
  const result = role === 'Especialista'
    ? await apiClient.POST('/usuarios/especialistas', { body })
    : await apiClient.POST('/usuarios/administradores', { body })
  return requireResponse(result.data, result.response)
}

export async function updateUser(id: string, body: { nombre: string; correo: string; cedula: string }): Promise<User> {
  const result = await apiClient.PUT('/usuarios/{id}', { params: { path: { id } }, body })
  return requireResponse(result.data, result.response)
}

export async function updateUserState(id: string, estado: boolean): Promise<User> {
  const result = await apiClient.PATCH('/usuarios/{id}/estado', { params: { path: { id } }, body: { estado } })
  return requireResponse(result.data, result.response)
}

export async function resetUserPassword(id: string): Promise<void> {
  const result = await apiClient.POST('/usuarios/{id}/restablecer-contrasena', { params: { path: { id } } })
  await requireSuccess(result.response)
}

export async function getIndicators() {
  const result = await apiClient.GET('/admin/indicadores')
  return requireResponse(result.data, result.response)
}

export async function getTrends(period: 'semanal' | 'mensual') {
  const result = await apiClient.GET('/admin/tendencias', { params: { query: { periodo: period } } })
  return requireResponse(result.data, result.response)
}
