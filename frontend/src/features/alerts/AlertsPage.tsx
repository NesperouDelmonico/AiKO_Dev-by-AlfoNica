import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient, requireResponse } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import type { components } from '../../api/schema'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Select } from '../../components/ui/Select'
import { useAuth } from '../../auth/AuthContext'
import { formatDate } from '../../lib/date'

type AlertType = components['schemas']['TipoAlerta']
type AlertState = components['schemas']['EstadoAlerta']

export function AlertsPage() {
  const { user } = useAuth()
  const [type, setType] = useState('')
  const [state, setState] = useState('')
  const filters = {
    // El backend ya limita las alertas al especialista autenticado; user.id es
    // el id de usuario, no el del perfil de especialista.
    ...(type ? { tipo: type as AlertType } : {}),
    ...(state ? { estado: state as AlertState } : {}),
  }
  const query = useQuery({
    queryKey: queryKeys.alerts.list(filters),
    queryFn: async () => {
      const result = await apiClient.GET('/alertas', { params: { query: filters } })
      return requireResponse(result.data, result.response)
    },
    enabled: Boolean(user?.id),
  })
  const alerts = query.data ?? []
  return (
    <div className="space-y-6">
      <header><p className="mb-1 text-sm font-semibold text-brand-primary">AiKO · Especialista</p><h1 className="mb-0 text-3xl">Alertas</h1><p className="mb-0 mt-2 text-sm text-[var(--color-text-muted)]">Las alertas se resuelven automáticamente; no requieren una acción manual.</p></header>
      <Card>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <label htmlFor="alert-type" className="text-sm font-semibold">Tipo
            <Select id="alert-type" value={type} onChange={(event) => setType(event.target.value)} className="mt-1"><option value="">Todos</option><option value="BajoRendimiento">Bajo rendimiento</option><option value="Inactividad">Inactividad</option></Select>
          </label>
          <label htmlFor="alert-state" className="text-sm font-semibold">Estado
            <Select id="alert-state" value={state} onChange={(event) => setState(event.target.value)} className="mt-1"><option value="">Todos</option><option>Activa</option><option>Resuelta</option></Select>
          </label>
        </div>
        {query.isPending && <div aria-busy="true" aria-label="Cargando alertas" className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-purple-50" />)}</div>}
        {query.isError && <ErrorState title="No se pudieron cargar las alertas" message={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button>} />}
        {query.isSuccess && alerts.length === 0 && <EmptyState title="Sin alertas" description="No hay alertas con estos filtros." />}
        <ul className="space-y-3 pl-0">{alerts.map((alert, i) => {
          const label = alert.tipo === 'BajoRendimiento' ? 'Bajo rendimiento' : alert.tipo === 'Inactividad' ? 'Inactividad' : 'Tipo no disponible'
          return <li key={alert.id ?? `${alert.paciente_id}-${i}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4">
            <div><h2 className="mb-1 text-base">{label}</h2><p className="mb-1 text-sm">Paciente: {alert.paciente_id ? <Link to={`/especialista/pacientes/${alert.paciente_id}`}>Ver paciente</Link> : '—'}</p><p className="mb-0 text-xs text-[var(--color-text-muted)]">{alert.fecha_generada ? formatDate(alert.fecha_generada, { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha no disponible'}</p></div>
            <Badge variant={alert.estado === 'Activa' ? 'attention' : 'success'}>{alert.estado ?? 'Estado no disponible'}</Badge>
          </li>
        })}</ul>
      </Card>
    </div>
  )
}
