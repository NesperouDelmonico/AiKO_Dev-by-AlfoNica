import { ApiError, requireResponse, requireSuccess } from '../../api/client'
import { apiClient } from '../../api/client'
import type { components } from '../../api/schema'

export type Patient = components['schemas']['PacienteListado']
export type PatientList = components['schemas']['PaginatedMeta'] & { data?: Patient[] }
export type SearchPatient = components['schemas']['PacienteListado']
export type Exercise = components['schemas']['Ejercicio']
export type TherapyRoute = components['schemas']['RutaTerapeutica']
export type RouteProgress = { porcentaje?: number; completados?: number; pendientes?: number }
export type DomainProgress = Array<{
  categoria?: components['schemas']['CategoriaEjercicio']
  porcentaje?: number
  ejercicios?: Array<{
    ejercicio_id: string
    nombre: string
    intentos: number
    promedio_puntaje: number
    mejor_puntaje: number
    ultimo_puntaje: number
  }>
}>
export type TemporalProgress = { serie?: Array<{ fecha?: string; valor?: number }>; aviso?: string | null }
export type HistoryItem = components['schemas']['ResultadoEjercicio']
export type PaginatedHistory = components['schemas']['PaginatedMeta'] & { data?: HistoryItem[] }
export type PatientAlert = components['schemas']['Alerta']
export type Achievements = { nivel_actual?: number; xp_total?: number; insignias?: components['schemas']['Insignia'][] }
export type Observation = components['schemas']['Observacion']
export type PaginatedObservations = components['schemas']['PaginatedMeta'] & { data?: Observation[] }

export type PatientFilters = { page: number; limit: number; q?: string; estado?: string }

export async function getPatients(filters: PatientFilters): Promise<PatientList> {
  if (filters.estado) {
    const result = await apiClient.GET('/pacientes/buscar', {
      params: {
        query: {
          page: filters.page,
          limit: filters.limit,
          ...(filters.q ? { q: filters.q } : {}),
          estado: filters.estado,
        },
      },
    })
    // El backend actual devuelve una lista; si algún día pagina, se usa tal cual.
    const body: unknown = await requireResponse(result.data, result.response)
    if (Array.isArray(body)) {
      return { total: body.length, page: 1, limit: body.length, data: body as Patient[] }
    }
    return body as PatientList
  }
  const result = await apiClient.GET('/pacientes', {
    params: { query: { page: filters.page, limit: filters.limit, ...(filters.q ? { q: filters.q } : {}) } },
  })
  return requireResponse(result.data, result.response)
}

export async function createPatient(body: {
  nombre: string
  cedula: string
  correo: string
  fecha_nacimiento: string
  umbral_bajo_rendimiento: number
  umbral_dias_inactividad: number
}): Promise<components['schemas']['Paciente']> {
  const result = await apiClient.POST('/pacientes', { body })
  return requireResponse(result.data, result.response)
}

export async function getPatient(id: string): Promise<components['schemas']['Paciente']> {
  const result = await apiClient.GET('/pacientes/{id}', { params: { path: { id } } })
  return requireResponse(result.data, result.response)
}

export async function getActiveRoute(id: string): Promise<TherapyRoute | null> {
  const result = await apiClient.GET('/pacientes/{id}/rutas/activa', { params: { path: { id } } })
  if (result.response.status === 404) return null
  return requireResponse(result.data, result.response)
}

export async function getRouteHistory(id: string, page: number, limit: number, estado?: 'Activa' | 'Histórica') {
  const result = await apiClient.GET('/pacientes/{id}/rutas', {
    params: { path: { id }, query: { page, limit, ...(estado ? { estado } : {}) } },
  })
  return requireResponse(result.data, result.response)
}

export type RoutePeriod = 1 | 7 | 15 | 30

export async function createRoute(
  id: string,
  exercises: Array<{ ejercicio_id: string; orden: number; dia?: number }>,
  duracionDias?: RoutePeriod,
) {
  const result = await apiClient.POST('/pacientes/{id}/rutas', {
    params: { path: { id } },
    body: { ejercicios: exercises, ...(duracionDias ? { duracion_dias: duracionDias } : {}) },
  })
  return requireResponse(result.data, result.response)
}

export async function addRouteExercise(routeId: string, exerciseId: string, order: number, day?: number) {
  const result = await apiClient.POST('/rutas/{id}/ejercicios', {
    params: { path: { id: routeId } }, body: { ejercicio_id: exerciseId, orden: order, ...(day ? { dia: day } : {}) },
  })
  return requireResponse(result.data, result.response)
}

export async function deleteRouteExercise(routeId: string, routeExerciseId: string) {
  const result = await apiClient.DELETE('/rutas/{id}/ejercicios/{rutaEjercicioId}', {
    params: { path: { id: routeId, rutaEjercicioId: routeExerciseId } },
  })
  await requireSuccess(result.response)
}

export async function replaceRouteExercise(routeId: string, routeExerciseId: string, exerciseId: string) {
  const result = await apiClient.PATCH('/rutas/{id}/ejercicios/{rutaEjercicioId}/reemplazar', {
    params: { path: { id: routeId, rutaEjercicioId: routeExerciseId } }, body: { nuevo_ejercicio_id: exerciseId },
  })
  return requireResponse(result.data, result.response)
}

export async function getRouteProgress(routeId: string): Promise<RouteProgress> {
  const result = await apiClient.GET('/rutas/{id}/progreso', { params: { path: { id: routeId } } })
  return requireResponse(result.data, result.response)
}

export async function getExercises(): Promise<Exercise[]> {
  const result = await apiClient.GET('/ejercicios')
  return requireResponse(result.data, result.response)
}

export async function getDomainProgress(
  id: string,
  filters: { desde?: string; hasta?: string },
): Promise<DomainProgress> {
  const result = await apiClient.GET('/pacientes/{id}/progreso/dominio', {
    params: { path: { id }, query: filters },
  })
  return requireResponse(result.data, result.response)
}

export async function getTemporalProgress(
  id: string,
  filters: { desde?: string; hasta?: string },
): Promise<TemporalProgress> {
  const result = await apiClient.GET('/pacientes/{id}/progreso/temporal', {
    params: { path: { id }, query: filters },
  })
  return requireResponse(result.data, result.response)
}

export async function getHistory(id: string, page: number, limit: number): Promise<PaginatedHistory> {
  const result = await apiClient.GET('/pacientes/{id}/historial', {
    params: { path: { id }, query: { page, limit } },
  })
  return requireResponse(result.data, result.response)
}

export async function getAlerts(id: string): Promise<PatientAlert[]> {
  const result = await apiClient.GET('/pacientes/{id}/alertas', { params: { path: { id } } })
  return requireResponse(result.data, result.response)
}

export async function getAchievements(id: string): Promise<Achievements> {
  const result = await apiClient.GET('/pacientes/{id}/perfil-logros', { params: { path: { id } } })
  return requireResponse(result.data, result.response)
}

export async function getObservations(
  id: string,
  page: number,
  limit: number,
): Promise<PaginatedObservations> {
  const result = await apiClient.GET('/pacientes/{id}/observaciones', {
    params: { path: { id }, query: { page, limit } },
  })
  return requireResponse(result.data, result.response)
}

export async function createObservation(id: string, texto: string): Promise<Observation> {
  const result = await apiClient.POST('/pacientes/{id}/observaciones', {
    params: { path: { id } },
    body: { texto },
  })
  return requireResponse(result.data, result.response)
}

export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status
}
