import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Plus, Route as RouteIcon, Trophy } from 'lucide-react'
import { getErrorMessage, imageUrl } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { formatDate } from '../../lib/date'
import { gameTypeLabel } from '../exercises/exerciseTypes'
import { ObservationDialog } from './ObservationDialog'
import { getActiveRoute, getAchievements, getAlerts, getConsistency, getDomainProgress, getExercises, getHistory, getObservations, getPatient, getRouteHistory, getRouteProgress, getRouteResults, getTemporalProgress, isApiStatus } from './api'
import { PatientSummary } from './PatientSummary'
import { RouteIslands } from './RouteIslands'
import { formatPercent, roundPercent } from '../../lib/percent'
import { QueryError, SectionSkeleton } from './PatientStates'
import type { PatientAlert } from './api'
import type { TemporalChartPoint } from './TemporalProgressChart'
import { PatientSettingsDialog } from './PatientSettingsDialog'

const TemporalProgressChart = lazy(() => import('./TemporalProgressChart').then((module) => ({
  default: module.TemporalProgressChart,
})))

const HISTORY_PAGE_SIZE = 10
const OBSERVATION_PAGE_SIZE = 10
const numberFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

function textOrDash(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

function ErrorForPatient({ error, retry }: { error: unknown; retry: () => void }) {
  const action = (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <Button variant="secondary" onClick={retry}>Reintentar</Button>
      <Link to="/especialista/pacientes">Volver a mis pacientes</Link>
    </div>
  )
  if (isApiStatus(error, 403)) {
    return <ErrorState title="No puedes ver este paciente con esta cuenta." action={action} />
  }
  if (isApiStatus(error, 404)) {
    return <ErrorState title="No encontramos este perfil." message="Revisa el enlace o vuelve a la lista." action={action} />
  }
  return <QueryError title="No pudimos cargar la información. Inténtalo de nuevo." error={error} retry={retry} />
}

function SectionError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-3">
      <p role="alert" className="mb-2 text-sm text-[var(--color-attention-text)]">{getErrorMessage(error)}</p>
      <Button variant="secondary" size="sm" onClick={retry}>Reintentar</Button>
    </div>
  )
}

function usePatientQuery(patientId: string) {
  return useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => getPatient(patientId),
    enabled: Boolean(patientId),
  })
}

function statusBadge(status: PatientAlert['estado']) {
  if (status === 'Activa') return <Badge variant="attention">Activa</Badge>
  if (status === 'Resuelta') return <Badge variant="success">Resuelta</Badge>
  return <Badge variant="neutral">Estado no disponible</Badge>
}

export function PatientDetailPage() {
  const { id = '' } = useParams()
  const [observationOpen, setObservationOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [routeTab, setRouteTab] = useState<'activa' | 'historial'>('activa')
  const [routesPage, setRoutesPage] = useState(1)
  const [routeFilter, setRouteFilter] = useState<'Activa' | 'Histórica' | ''>('')
  const [historyPage, setHistoryPage] = useState(1)
  const [observationPage, setObservationPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const patientQuery = usePatientQuery(id)

  const routeQuery = useQuery({
    queryKey: queryKeys.patients.route(id),
    queryFn: () => getActiveRoute(id),
    enabled: Boolean(id) && patientQuery.isSuccess,
  })
  const routeId = routeQuery.data?.id || ''
  const routeProgressQuery = useQuery({
    queryKey: queryKeys.patients.routeProgress(routeId),
    queryFn: () => getRouteProgress(routeId),
    enabled: Boolean(routeId),
  })
  const routeExercisesQuery = useQuery({
    queryKey: queryKeys.patients.exercises(id),
    queryFn: getExercises,
    enabled: Boolean(routeId),
  })
  const routeResultsQuery = useQuery({
    queryKey: queryKeys.patients.routeResults(routeId),
    queryFn: () => getRouteResults(routeId),
    enabled: Boolean(routeId),
  })
  const consistencyQuery = useQuery({
    queryKey: queryKeys.patients.consistency(id),
    queryFn: () => getConsistency(id),
    enabled: Boolean(id) && patientQuery.isSuccess,
  })
  const routesQuery = useQuery({
    queryKey: queryKeys.patients.routes(id, routesPage, 10, routeFilter || undefined),
    queryFn: () => getRouteHistory(id, routesPage, 10, routeFilter || undefined),
    enabled: Boolean(id) && patientQuery.isSuccess && routeTab === 'historial',
  })
  const dateFilters = useMemo(() => ({
    ...(fromDate ? { desde: fromDate } : {}),
    ...(toDate ? { hasta: toDate } : {}),
  }), [fromDate, toDate])
  const domainQuery = useQuery({
    queryKey: queryKeys.patients.domainProgress(id, dateFilters),
    queryFn: () => getDomainProgress(id, dateFilters),
    enabled: Boolean(id) && patientQuery.isSuccess,
  })
  const temporalQuery = useQuery({
    queryKey: queryKeys.patients.temporalProgress(id, dateFilters),
    queryFn: () => getTemporalProgress(id, dateFilters),
    enabled: Boolean(id) && patientQuery.isSuccess,
  })
  const historyQuery = useQuery({
    queryKey: queryKeys.patients.history(id, historyPage, HISTORY_PAGE_SIZE),
    queryFn: () => getHistory(id, historyPage, HISTORY_PAGE_SIZE),
    enabled: Boolean(id) && patientQuery.isSuccess,
  })
  const alertsQuery = useQuery({
    queryKey: queryKeys.patients.alerts(id),
    queryFn: () => getAlerts(id),
    enabled: Boolean(id) && patientQuery.isSuccess,
  })
  const achievementsQuery = useQuery({
    queryKey: queryKeys.patients.achievements(id),
    queryFn: () => getAchievements(id),
    enabled: Boolean(id) && patientQuery.isSuccess,
  })
  const observationsQuery = useQuery({
    queryKey: queryKeys.patients.observations(id, observationPage, OBSERVATION_PAGE_SIZE),
    queryFn: () => getObservations(id, observationPage, OBSERVATION_PAGE_SIZE),
    enabled: Boolean(id) && patientQuery.isSuccess,
  })

  const closeObservation = useCallback(() => setObservationOpen(false), [])
  if (patientQuery.isPending) return <div className="space-y-4"><SectionSkeleton title="paciente" /><SectionSkeleton title="información básica" /></div>
  if (patientQuery.isError) return <ErrorForPatient error={patientQuery.error} retry={() => void patientQuery.refetch()} />
  const patient = patientQuery.data
  const routePercent = routeProgressQuery.data?.porcentaje ?? 0
  const history = historyQuery.data?.data ?? []
  const observations = observationsQuery.data?.data ?? []
  const insignias = achievementsQuery.data?.insignias ?? []
  const chartData: TemporalChartPoint[] = (temporalQuery.data?.serie ?? []).map((point) => ({
    fecha: point.fecha ? formatDate(point.fecha, { day: '2-digit', month: 'short' }) : '—',
    valor: point.valor ?? 0,
    fechaCompleta: point.fecha || '',
  }))
  const totalHistoryPages = Math.max(1, Math.ceil((historyQuery.data?.total ?? history.length) / HISTORY_PAGE_SIZE))
  const totalObservationPages = Math.max(1, Math.ceil((observationsQuery.data?.total ?? observations.length) / OBSERVATION_PAGE_SIZE))
  return (
    <div className="rise-stagger space-y-6">
      <PageHeader
        title={patient.nombre || 'Paciente'}
        description={`Consulta el progreso y seguimiento de ${patient.nombre || 'tu paciente'}.`}
        backTo="/especialista/pacientes"
        backLabel="Volver a mis pacientes"
        actions={<>
          <Button variant="secondary" onClick={() => setSettingsOpen(true)}>Editar información</Button>
          <Button onClick={() => setObservationOpen(true)}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Nueva observación
          </Button>
        </>}
      />

      <PatientSummary
        patient={patient}
        routePercent={routeQuery.data ? routePercent : null}
        streak={consistencyQuery.data?.racha_actual ?? null}
        badges={achievementsQuery.data ? insignias.length : null}
        activeAlerts={alertsQuery.data ? alertsQuery.data.filter((alert) => alert.estado === 'Activa').length : null}
      />

      <section aria-labelledby="active-route-title">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="active-route-title" className="mb-0 flex items-center gap-2 text-xl">
              <RouteIcon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              Ruta terapéutica activa
            </h2>
            {routeQuery.data && <Link className="text-sm font-semibold" to={`/especialista/pacientes/${id}/ruta`}>Editar ruta</Link>}
          </div>
          {routeQuery.isPending ? <SectionSkeleton title="ruta activa" /> : null}
          {routeQuery.isError && <SectionError error={routeQuery.error} retry={() => void routeQuery.refetch()} />}
          {routeQuery.isSuccess && !routeQuery.data && (
            <EmptyState
              title="Todavía no tiene una ruta activa"
              description="Todavía no hay una ruta terapéutica activa para este paciente."
              action={<Link className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-brand-heading hover:bg-purple-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand-primary" to={`/especialista/pacientes/${id}/ruta`}>Crear ruta</Link>}
            />
          )}
          {routeQuery.data && (
            <div className="space-y-4">
              {routeProgressQuery.isError && <SectionError error={routeProgressQuery.error} retry={() => void routeProgressQuery.refetch()} />}
              {routeProgressQuery.data && (
                <p className="mb-0 text-sm text-[var(--color-text-muted)]">
                  <strong className="text-brand-heading">{formatPercent(routePercent)}</strong> de la ruta · {routeProgressQuery.data.completados ?? 0} ejercicios completados. Toca una isla para ver cómo le fue cada día.
                </p>
              )}
              {(routeExercisesQuery.isPending || routeResultsQuery.isPending) && <SectionSkeleton title="islas de la ruta" />}
              {routeExercisesQuery.isError && <SectionError error={routeExercisesQuery.error} retry={() => void routeExercisesQuery.refetch()} />}
              {routeResultsQuery.isError && <SectionError error={routeResultsQuery.error} retry={() => void routeResultsQuery.refetch()} />}
              {routeExercisesQuery.isSuccess && routeResultsQuery.isSuccess && (
                <RouteIslands route={routeQuery.data} exercises={routeExercisesQuery.data} results={routeResultsQuery.data} accessory={patient.accesorio} />
              )}
            </div>
          )}
        </Card>
      </section>

      <section aria-labelledby="route-history-title">
        <Card>
          <div role="tablist" aria-label="Rutas del paciente" className="mb-4 flex flex-wrap items-center gap-2">
            <Button role="tab" aria-selected={routeTab === 'activa'} variant={routeTab === 'activa' ? 'primary' : 'secondary'} onClick={() => setRouteTab('activa')}>Ruta activa</Button>
            <Button role="tab" aria-selected={routeTab === 'historial'} variant={routeTab === 'historial' ? 'primary' : 'secondary'} onClick={() => setRouteTab('historial')}>Historial de rutas</Button>
          </div>
          {routeTab === 'activa' && <p className="mb-0 text-sm text-[var(--color-text-muted)]">La ruta actual se muestra en la sección anterior. <Link to={`/especialista/pacientes/${id}/ruta`}>Editar ruta</Link></p>}
          {routeTab === 'historial' && <>
            <h2 id="route-history-title" className="mb-3 text-xl">Historial de rutas</h2>
            <label htmlFor="route-history-state" className="mb-4 block text-sm font-semibold">Estado
              <Select id="route-history-state" className="mt-1 max-w-xs" value={routeFilter} onChange={(event) => { setRouteFilter(event.target.value as typeof routeFilter); setRoutesPage(1) }}>
                <option value="">Todos</option><option>Activa</option><option>Histórica</option>
              </Select>
            </label>
            {routesQuery.isPending && <SectionSkeleton title="historial de rutas" />}
            {routesQuery.isError && <SectionError error={routesQuery.error} retry={() => void routesQuery.refetch()} />}
            {routesQuery.isSuccess && (routesQuery.data.data ?? []).length === 0 && <EmptyState title="Aún no hay rutas anteriores" />}
            <ol className="space-y-3 pl-6">{(routesQuery.data?.data ?? []).map((route, index) => (
              <li key={route.id ?? index} className="rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3"><span>{route.fecha_creacion ? formatDate(route.fecha_creacion, { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha no disponible'}</span><Badge variant={route.estado === 'Activa' ? 'success' : 'neutral'}>{route.estado ?? 'Estado no disponible'}</Badge></div>
                <p className="mb-0 mt-2 text-xs text-[var(--color-text-muted)]">{(route.ejercicios ?? []).filter((step) => step.estado !== 'Reemplazado').length} ejercicios activos en la ruta</p>
              </li>
            ))}</ol>
            {(routesQuery.data?.total ?? 0) > 10 && <div className="mt-4 flex justify-end gap-2"><Button size="sm" variant="secondary" disabled={routesPage <= 1} onClick={() => setRoutesPage((page) => page - 1)}>Anterior</Button><Button size="sm" variant="secondary" disabled={routesPage >= Math.ceil((routesQuery.data?.total ?? 0) / 10)} onClick={() => setRoutesPage((page) => page + 1)}>Siguiente</Button></div>}
          </>}
        </Card>
      </section>

      <section aria-labelledby="domain-progress-title" className="space-y-4">
        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="domain-progress-title" className="mb-1 text-xl">Puntajes por ejercicio</h2>
              <p className="mb-0 text-sm text-[var(--color-text-muted)]">Promedios, mejores y últimos puntajes del período seleccionado.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-brand-heading" htmlFor="progress-from">Desde
                <Input id="progress-from" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} className="mt-1" />
              </label>
              <label className="text-xs font-semibold text-brand-heading" htmlFor="progress-to">Hasta
                <Input id="progress-to" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="mt-1" />
              </label>
            </div>
          </div>
          {domainQuery.isPending && <SectionSkeleton title="puntajes por dominio" />}
          {domainQuery.isError && <SectionError error={domainQuery.error} retry={() => void domainQuery.refetch()} />}
          {domainQuery.isSuccess && domainQuery.data.length === 0 && <EmptyState title="Los puntajes aparecerán cuando complete ejercicios." />}
          {domainQuery.data && domainQuery.data.length > 0 && (
            <div className="space-y-5">
              {domainQuery.data.map((category) => (
                <section key={category.categoria || 'sin-categoria'} aria-label={category.categoria || 'Categoría'}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="mb-0 text-base">{category.categoria || 'Categoría sin nombre'}</h3>
                    <span className="text-sm font-semibold text-brand-heading">{formatPercent(category.porcentaje)} promedio</span>
                  </div>
                  <div className="space-y-3">
                    {(category.ejercicios ?? []).map((exercise) => {
                      const score = roundPercent(exercise.promedio_puntaje)
                      const rating = score >= 70 ? { label: 'Alto', variant: 'success' as const } : score >= 40 ? { label: 'Medio', variant: 'pending' as const } : { label: 'Bajo', variant: 'attention' as const }
                      return (
                        <div key={exercise.ejercicio_id} className="rounded-xl border border-[var(--color-border)] p-4">
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="mb-1 text-sm">{exercise.nombre}</h4>
                              <p className="mb-0 text-xs text-[var(--color-text-muted)]">{exercise.intentos} {exercise.intentos === 1 ? 'intento' : 'intentos'}</p>
                            </div>
                            <Badge variant={rating.variant}>Nivel {rating.label}</Badge>
                          </div>
                          <div role="progressbar" aria-label={`Promedio de ${exercise.nombre}: ${score} por ciento, nivel ${rating.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="mb-3 h-2 overflow-hidden rounded-full bg-purple-100">
                            <div className="bar-fill h-full rounded-full bg-brand-primary" style={{ width: `${score}%` }} />
                          </div>
                          <dl className="grid grid-cols-3 gap-2 text-xs">
                            <div><dt className="text-[var(--color-text-muted)]">Promedio</dt><dd className="mb-0 mt-1 font-semibold">{formatPercent(exercise.promedio_puntaje)}</dd></div>
                            <div><dt className="text-[var(--color-text-muted)]">Mejor</dt><dd className="mb-0 mt-1 font-semibold">{formatPercent(exercise.mejor_puntaje)}</dd></div>
                            <div><dt className="text-[var(--color-text-muted)]">Último</dt><dd className="mb-0 mt-1 font-semibold">{formatPercent(exercise.ultimo_puntaje)}</dd></div>
                          </dl>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section aria-labelledby="temporal-progress-title">
        <Card>
          <h2 id="temporal-progress-title" className="mb-4 text-xl">Evolución en el tiempo</h2>
          {temporalQuery.isPending && <SectionSkeleton title="evolución temporal" />}
          {temporalQuery.isError && <SectionError error={temporalQuery.error} retry={() => void temporalQuery.refetch()} />}
          {temporalQuery.data && (
            <>
              {temporalQuery.data.aviso && <p role="status" className="rounded-xl bg-[var(--color-pending-bg)] p-3 text-sm text-[var(--color-pending-text)]">{temporalQuery.data.aviso}</p>}
              {chartData.length > 0 ? (
                <Suspense fallback={<SectionSkeleton title="gráfica de evolución" />}>
                  <TemporalProgressChart data={chartData} />
                </Suspense>
              ) : <EmptyState title="Aún no hay progreso para mostrar" description="Selecciona otro rango o espera a que complete sesiones." />}
            </>
          )}
        </Card>
      </section>

      <section aria-labelledby="history-title">
        <Card>
          <h2 id="history-title" className="mb-4 text-xl">Historial de intentos</h2>
          {historyQuery.isPending && <SectionSkeleton title="historial" />}
          {historyQuery.isError && <SectionError error={historyQuery.error} retry={() => void historyQuery.refetch()} />}
          {historyQuery.isSuccess && history.length === 0 && <EmptyState title="Todavía no hay intentos registrados" />}
          {history.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead><tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                    <th scope="col" className="p-3">Ejercicio</th><th scope="col" className="p-3">Categoría</th><th scope="col" className="p-3">Puntaje</th><th scope="col" className="p-3">Aciertos</th><th scope="col" className="p-3">Tiempo de reacción</th><th scope="col" className="p-3">XP</th><th scope="col" className="p-3">Monedas</th><th scope="col" className="p-3">Dibujos</th><th scope="col" className="p-3">Fecha</th>
                  </tr></thead>
                  <tbody>{history.map((attempt) => (
                    <tr key={attempt.id} className="border-b border-purple-100 last:border-0">
                      <td className="p-3 font-medium text-brand-heading">{attempt.ejercicio_nombre || '—'}{attempt.xp_ganado === 0 && <span className="ml-2"><Badge variant="attention">No aprobado</Badge></span>}</td>
                      <td className="p-3">{attempt.categoria || '—'}{attempt.tipo && <span className="block text-xs text-[var(--color-text-muted)]">{gameTypeLabel(attempt.tipo)}</span>}</td>
                      <td className="p-3">{attempt.puntaje == null ? '—' : formatPercent(attempt.puntaje)}</td>
                      <td className="p-3">{textOrDash(attempt.aciertos)}</td>
                      <td className="p-3">{attempt.tiempo_reaccion_ms == null ? '—' : `${numberFormat.format(attempt.tiempo_reaccion_ms)} ms`}</td>
                      <td className="p-3">{textOrDash(attempt.xp_ganado)}{attempt.xp_doble && <span className="ml-1 text-xs font-semibold text-amber-700">×2</span>}</td>
                      <td className="p-3">{textOrDash(attempt.monedas_ganadas ?? 0)}</td>
                      <td className="p-3">{attempt.dibujos?.length
                        ? <span className="flex flex-wrap gap-1">{attempt.dibujos.map((drawing, i) => (
                          <a key={drawing} href={imageUrl(drawing)} target="_blank" rel="noreferrer" aria-label={`Ver dibujo ${i + 1} de ${attempt.ejercicio_nombre ?? 'ejercicio'}`}>
                            <img src={imageUrl(drawing)} alt="" loading="lazy" className="h-12 w-12 rounded-lg border border-[var(--color-border)] bg-white object-contain" />
                          </a>))}</span>
                        : '—'}</td>
                      <td className="p-3">{attempt.fecha ? formatDate(attempt.fecha, { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <PageControls page={historyPage} pages={totalHistoryPages} onChange={setHistoryPage} label="intentos" />
            </>
          )}
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="alerts-title">
          <Card>
            <h2 id="alerts-title" className="mb-4 text-xl">Alertas</h2>
            {alertsQuery.isPending && <SectionSkeleton title="alertas" />}
            {alertsQuery.isError && <SectionError error={alertsQuery.error} retry={() => void alertsQuery.refetch()} />}
            {alertsQuery.data && alertsQuery.data.length === 0 && <EmptyState title="No hay alertas asociadas a este paciente." />}
            {alertsQuery.data && alertsQuery.data.length > 0 && (
              <ul className="space-y-3 pl-0">
                {alertsQuery.data.map((alert) => (
                  <li key={alert.id} className="flex list-none items-center justify-between gap-3 rounded-xl bg-purple-50/70 p-3">
                    <div><p className="mb-1 text-sm font-medium text-brand-heading">{alert.tipo || 'Alerta'}</p><p className="mb-0 text-xs text-[var(--color-text-muted)]">{alert.fecha_generada ? formatDate(alert.fecha_generada, { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha no disponible'}</p></div>
                    {statusBadge(alert.estado)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="achievements-title">
          <Card>
            <h2 id="achievements-title" className="mb-4 flex items-center gap-2 text-xl"><Trophy aria-hidden="true" className="size-5" strokeWidth={1.75} />Logros</h2>
            {achievementsQuery.isPending && <SectionSkeleton title="logros" />}
            {achievementsQuery.isError && <SectionError error={achievementsQuery.error} retry={() => void achievementsQuery.refetch()} />}
            {achievementsQuery.data && (
              <>
                <div className="mb-4 flex gap-3">
                  <Badge variant="neutral">Nivel {achievementsQuery.data.nivel_actual ?? '—'}</Badge>
                  <Badge variant="neutral">{textOrDash(achievementsQuery.data.xp_total)} XP</Badge>
                </div>
                {insignias.length === 0 ? <EmptyState title="Aún no tiene insignias" /> : (
                  <ul className="space-y-3 pl-0">{insignias.map((badge, index) => <li key={badge.id || badge.nombre || index} className="list-none rounded-xl bg-purple-50/70 p-3"><p className="mb-1 text-sm font-semibold text-brand-heading">{badge.nombre || 'Insignia'}</p>{badge.descripcion && <p className="mb-0 text-xs text-[var(--color-text-muted)]">{badge.descripcion}</p>}</li>)}</ul>
                )}
              </>
            )}
          </Card>
        </section>
      </div>

      <section aria-labelledby="observations-title">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="observations-title" className="mb-0 text-xl">Observaciones</h2>
          </div>
          {observationsQuery.isPending && <SectionSkeleton title="observaciones" />}
          {observationsQuery.isError && <SectionError error={observationsQuery.error} retry={() => void observationsQuery.refetch()} />}
          {observationsQuery.isSuccess && observations.length === 0 && <EmptyState title="Todavía no hay observaciones." description="Puedes registrar una para documentar el seguimiento." />}
          {observations.length > 0 && (
            <>
              <ol className="space-y-3 pl-0">{observations.map((observation) => (
                <li key={observation.id} className="list-none rounded-xl border border-[var(--color-border)] p-4">
                  <p className="mb-2 whitespace-pre-wrap text-sm leading-6">{observation.texto}</p>
                  <time className="text-xs text-[var(--color-text-muted)]" dateTime={observation.fecha}>{observation.fecha ? formatDate(observation.fecha, { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha no disponible'}</time>
                </li>
              ))}</ol>
              <PageControls page={observationPage} pages={totalObservationPages} onChange={setObservationPage} label="observaciones" />
            </>
          )}
        </Card>
      </section>

      {observationOpen && <ObservationDialog patientId={id} onClose={closeObservation} />}
      {settingsOpen && <PatientSettingsDialog patient={patient} patientId={id} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function PageControls({ page, pages, onChange, label }: { page: number; pages: number; onChange: (page: number) => void; label: string }) {
  if (pages <= 1) return null
  return (
    <nav aria-label={`Paginación de ${label}`} className="mt-4 flex items-center justify-between gap-3">
      <p className="mb-0 text-xs text-[var(--color-text-muted)]">Página {page} de {pages}</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Siguiente</Button>
      </div>
    </nav>
  )
}
