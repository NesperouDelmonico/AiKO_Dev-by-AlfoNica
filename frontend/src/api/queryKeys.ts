export const queryKeys = {
  users: {
    all: ['usuarios'] as const,
    list: (filters: Record<string, string | number | boolean | undefined>) => ['usuarios', 'lista', filters] as const,
    detail: (id: string) => ['usuarios', id] as const,
    specialists: ['usuarios', 'especialistas'] as const,
  },
  patients: {
    all: ['pacientes'] as const,
    list: (filters: Record<string, string | number | undefined>) => ['pacientes', 'lista', filters] as const,
    detail: (id: string) => ['pacientes', id] as const,
    route: (id: string) => ['pacientes', id, 'ruta-activa'] as const,
    routeProgress: (routeId: string) => ['rutas', routeId, 'progreso'] as const,
    exercises: (id: string) => ['pacientes', id, 'ejercicios'] as const,
    domainProgress: (id: string, filters: { desde?: string; hasta?: string }) =>
      ['pacientes', id, 'progreso', 'dominio', filters] as const,
    temporalProgress: (id: string, filters: { desde?: string; hasta?: string }) =>
      ['pacientes', id, 'progreso', 'temporal', filters] as const,
    history: (id: string, page: number, limit: number) =>
      ['pacientes', id, 'historial', page, limit] as const,
    alerts: (id: string) => ['pacientes', id, 'alertas'] as const,
    achievements: (id: string) => ['pacientes', id, 'perfil-logros'] as const,
    observations: (id: string, page: number, limit: number) =>
      ['pacientes', id, 'observaciones', page, limit] as const,
    observationsList: (id: string) => ['pacientes', id, 'observaciones'] as const,
    routes: (id: string, page: number, limit: number, estado?: string) =>
      ['pacientes', id, 'rutas', page, limit, estado] as const,
    routesAll: (id: string) => ['pacientes', id, 'rutas'] as const,
  },
  alerts: {
    all: ['alertas'] as const,
    list: (filters: Record<string, string | number | undefined>) => ['alertas', 'lista', filters] as const,
  },
  exercises: {
    all: ['ejercicios'] as const,
    list: (filters: Record<string, string | number | undefined>) => ['ejercicios', 'lista', filters] as const,
  },
  adminIndicators: ['admin', 'indicadores'] as const,
  adminTrends: (period: string) => ['admin', 'tendencias', period] as const,
}
