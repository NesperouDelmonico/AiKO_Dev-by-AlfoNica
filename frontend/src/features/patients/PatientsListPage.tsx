import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Search, UserRound } from 'lucide-react'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { getPatients, isApiStatus, type Patient } from './api'
import { PatientListSkeleton, QueryError } from './PatientStates'
import { useDebouncedValue } from './useDebouncedValue'
import { useAuth } from '../../auth/AuthContext'

const PAGE_SIZE = 12

function initials(name: string | undefined): string {
  return (name || 'Paciente')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toLocaleUpperCase('es-CO'))
    .join('')
}

function PatientCard({ patient }: { patient: Patient }) {
  return (
    <Link
      to={`/especialista/pacientes/${patient.id}`}
      aria-label={`Ver detalle de ${patient.nombre || 'paciente'}`}
      className="group rounded-card text-inherit no-underline focus-visible:outline-offset-4"
    >
      <Card className="h-full min-h-48 transition-shadow group-hover:shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-purple-100 text-sm font-semibold text-brand-heading">
              {initials(patient.nombre)}
            </span>
            <div className="min-w-0">
              <h2 className="mb-1 truncate text-base">{patient.nombre || 'Paciente'}</h2>
              <p className="mb-0 truncate text-xs text-[var(--color-text-muted)]">{patient.edad == null ? '—' : `${patient.edad} años`}</p>
            </div>
          </div>
          <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-brand-primary opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100" strokeWidth={1.75} />
        </div>
        <div className="mb-4 flex min-h-7 flex-wrap gap-2">
          {(patient.alertas_activas ?? 0) > 0 && <Badge variant="attention">Requiere atención</Badge>}
          {patient.estado === false && <Badge variant="pending">Cuenta inactiva</Badge>}
        </div>
        {patient.progreso_ruta ? (
          <div aria-label={`Ruta activa, ${patient.progreso_ruta.porcentaje}% completada`}>
            <div className="mb-1 flex justify-between gap-2 text-xs text-[var(--color-text-muted)]">
              <span>Ruta activa</span>
              <span>{patient.progreso_ruta.porcentaje}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Progreso de ruta: ${patient.progreso_ruta.porcentaje}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={patient.progreso_ruta.porcentaje}
              className="h-2 overflow-hidden rounded-full bg-purple-100"
            >
              <div className="h-full rounded-full bg-brand-primary" style={{ width: `${Math.min(100, Math.max(0, patient.progreso_ruta.porcentaje))}%` }} />
            </div>
          </div>
        ) : patient.progreso_ruta === null ? (
          <p className="mb-0 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <UserRound aria-hidden="true" className="size-4" strokeWidth={1.75} />
            No tiene una ruta activa.
          </p>
        ) : (
          <p className="mb-0 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <UserRound aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Progreso de ruta no disponible para este filtro
          </p>
        )}
      </Card>
    </Link>
  )
}

export function PatientsListPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const filters = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(status ? { estado: status } : {}),
  }
  const patientsQuery = useQuery({
    queryKey: queryKeys.patients.list(filters),
    queryFn: () => getPatients(filters),
  })

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  if (patientsQuery.isPending) return <PatientListSkeleton />
  if (patientsQuery.isError) {
    if (isApiStatus(patientsQuery.error, 403)) {
      return <ErrorState title="No tienes permiso para ver estos pacientes" message="El acceso a la lista de pacientes está restringido a tu cuenta." />
    }
    return <QueryError error={patientsQuery.error} retry={() => void patientsQuery.refetch()} title="No pudimos cargar tus pacientes" />
  }

  const patients = patientsQuery.data.data ?? []
  const userName = user?.nombre?.trim()
  const total = patientsQuery.data.total ?? patients.length
  const attention = patients.filter((patient) => (patient.alertas_activas ?? 0) > 0).length
  const hasAlertCounts = patients.every((patient) => typeof patient.alertas_activas === 'number')
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const attentionIsPageOnly = total > patients.length
  const hasFilters = Boolean(search.trim() || status)
  const patientCountLabel = hasFilters
    ? `${total} ${total === 1 ? 'paciente encontrado' : 'pacientes encontrados'}`
    : `${total} ${total === 1 ? 'paciente asignado' : 'pacientes asignados'}`
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="greeting-enter mb-1 text-lg font-semibold text-brand-primary">{userName ? `Hola, ${userName}` : 'Hola'}</p>
          <h1 className="mb-2 text-3xl">Mis pacientes</h1>
          <p className="mb-2 text-sm text-[var(--color-text-muted)]">Tus pacientes y su progreso reciente.</p>
          <p className="mb-0 text-sm text-[var(--color-text-muted)]">
            {patientCountLabel} · {hasAlertCounts ? `${attention} ${attention === 1 ? 'requiere' : 'requieren'} atención` : 'alertas no disponibles para este filtro'}
            {attentionIsPageOnly && hasAlertCounts ? ' en esta página' : ''}
          </p>
        </div>
        <Link
          to="/especialista/pacientes/nuevo"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand-primary"
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Nuevo paciente
        </Link>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <span className="sr-only">Buscar paciente por nombre</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" strokeWidth={1.75} />
            <Input
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Buscar por nombre"
              className="pl-10"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filtrar por estado de cuenta</span>
            <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
              <option value="">Todos los estados</option>
              <option value="true">Cuenta activa</option>
              <option value="false">Cuenta inactiva</option>
            </Select>
          </label>
        </div>
      </Card>

      {patients.length === 0 ? (
        <Card>
          <EmptyState
            title={search || status ? 'No encontramos pacientes con esos filtros.' : 'Todavía no tienes pacientes asignados.'}
            description={search || status ? 'Prueba con otra búsqueda o estado.' : 'Crea un perfil para iniciar su seguimiento.'}
            action={
              <Link to="/especialista/pacientes/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white no-underline hover:bg-[var(--color-primary-hover)]">
                <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                Nuevo paciente
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="list-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => <PatientCard key={patient.id} patient={patient} />)}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Paginación de pacientes" className="flex items-center justify-between">
          <p className="mb-0 text-sm text-[var(--color-text-muted)]">Página {page} de {pageCount}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
            <Button variant="secondary" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Siguiente</Button>
          </div>
        </nav>
      )}
      <div className="sr-only" aria-live="polite">{patientsQuery.isFetching ? 'Actualizando lista de pacientes' : ''}</div>
    </div>
  )
}
