import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, CalendarDays, Copy, Route as RouteIcon } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Select } from '../../components/ui/Select'
import { cn } from '../../lib/utils'
import { formatDate } from '../../lib/date'
import { display } from '../../lib/text'
import { gameTypeLabel } from '../exercises/exerciseTypes'
import { SectionSkeleton } from './PatientStates'
import {
  addRouteExercise, createRoute, deleteRouteExercise, getActiveRoute, getExercises, getPatient,
  getRouteProgress, replaceRouteExercise, type RoutePeriod,
} from './api'
import { copyDay, daysLostOnResize, emptyDays, move, PERIODS, planToSteps, resizePlan, type DayPlan } from './routePlan'

export function RouteBuilderPage() {
  const { id = '' } = useParams()
  const client = useQueryClient()
  const [period, setPeriod] = useState<RoutePeriod>(1)
  const [plan, setPlan] = useState<DayPlan>([[]])
  const [day, setDay] = useState(0)
  const [pendingPeriod, setPendingPeriod] = useState<RoutePeriod | null>(null)
  const [addId, setAddId] = useState('')
  const [addDay, setAddDay] = useState<number | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<{ stepId: string; exerciseId: string; nextId: string } | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ stepId: string; name: string } | null>(null)
  const [failure, setFailure] = useState('')
  const patientQuery = useQuery({ queryKey: queryKeys.patients.detail(id), queryFn: () => getPatient(id), enabled: Boolean(id) })
  const routeQuery = useQuery({ queryKey: queryKeys.patients.route(id), queryFn: () => getActiveRoute(id), enabled: Boolean(id) })
  const exercisesQuery = useQuery({ queryKey: queryKeys.patients.exercises(id), queryFn: getExercises, enabled: Boolean(id) })
  const routeId = routeQuery.data?.id ?? ''
  const progressQuery = useQuery({ queryKey: queryKeys.patients.routeProgress(routeId), queryFn: () => getRouteProgress(routeId), enabled: Boolean(routeId) })
  const exercises = exercisesQuery.data ?? []
  const level = patientQuery.data?.nivel_actual ?? 0
  const available = exercises.filter((exercise) => exercise.estado === 'Activo' && (exercise.nivel_dificultad ?? 0) <= level)
  const excluded = exercises.filter((exercise) => exercise.estado === 'Activo' && (exercise.nivel_dificultad ?? 0) > level)
  // Un ejercicio puede repetirse en la ruta (cada paso es independiente).
  const addable = available.filter((exercise) => exercise.id)
  const routeSteps = routeQuery.data?.ejercicios ?? []
  const currentSteps = routeSteps.filter((step) => step.estado !== 'Reemplazado')
  const lastDay = currentSteps.reduce((max, step) => Math.max(max, step.dia ?? 1), 1)
  const routeDuration = routeQuery.data?.duracion_dias ?? null
  const missing = emptyDays(plan)

  const invalidateRouteData = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.patients.route(id) }),
      client.invalidateQueries({ queryKey: queryKeys.patients.routeProgress(routeId) }),
      client.invalidateQueries({ queryKey: queryKeys.patients.routesAll(id) }),
      client.invalidateQueries({ queryKey: queryKeys.patients.detail(id) }),
      client.invalidateQueries({ queryKey: queryKeys.patients.all }),
    ])
  }
  const createMutation = useMutation({ mutationFn: () => createRoute(id, planToSteps(plan), period), onSuccess: invalidateRouteData })
  const addMutation = useMutation({
    mutationFn: () => addRouteExercise(routeId, addId, currentSteps.length + 1, addDay ?? lastDay),
    onSuccess: async () => { setAddId(''); setAddDay(null); await invalidateRouteData() },
  })
  const deleteMutation = useMutation({ mutationFn: () => deleteRouteExercise(routeId, deleteTarget!.stepId), onSuccess: invalidateRouteData })
  const replaceMutation = useMutation({ mutationFn: () => replaceRouteExercise(routeId, replaceTarget!.stepId, replaceTarget!.nextId), onSuccess: invalidateRouteData })

  async function perform(action: () => Promise<unknown>) {
    setFailure('')
    try { await action() } catch (error) { setFailure(getErrorMessage(error)) }
  }
  function exerciseName(exerciseId: string | undefined) {
    return exercises.find((exercise) => exercise.id === exerciseId)?.nombre ?? 'Ejercicio no disponible'
  }
  function exerciseKind(exerciseId: string | undefined) {
    return gameTypeLabel(exercises.find((exercise) => exercise.id === exerciseId)?.tipo)
  }
  function applyPeriod(next: RoutePeriod) {
    setPeriod(next)
    setPlan((current) => resizePlan(current, next))
    setDay((current) => Math.min(current, next - 1))
    setPendingPeriod(null)
  }
  function choosePeriod(next: RoutePeriod) {
    if (daysLostOnResize(plan, next).length) setPendingPeriod(next)
    else applyPeriod(next)
  }
  const updateDay = (index: number, items: string[]) => setPlan((current) => current.map((dayItems, i) => (i === index ? items : dayItems)))

  if (patientQuery.isPending || routeQuery.isPending || exercisesQuery.isPending) return <div className="space-y-4"><SectionSkeleton title="constructor de ruta" /><SectionSkeleton title="ejercicios disponibles" /></div>
  if (patientQuery.isError || routeQuery.isError || exercisesQuery.isError) {
    const error = patientQuery.error ?? routeQuery.error ?? exercisesQuery.error
    const retry = () => { void patientQuery.refetch(); void routeQuery.refetch(); void exercisesQuery.refetch() }
    return <ErrorState title="No se pudo cargar el constructor de ruta" message={error?.message ?? 'Ocurrió un error inesperado.'} action={<Button variant="secondary" onClick={retry}>Reintentar</Button>} />
  }
  const route = routeQuery.data
  const dayItems = plan[day] ?? []
  const agenda = route?.agenda
  const routeDays = [...new Set(routeSteps.map((step) => step.dia ?? 1))].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <Link to={`/especialista/pacientes/${id}`}>← Volver al paciente</Link>
      <header><p className="mb-1 text-sm font-semibold text-brand-primary">AiKO · Especialista</p><h1 className="mb-0 text-3xl">Ruta de {patientQuery.data.nombre}</h1></header>
      {failure && <p role="alert" className="rounded-xl bg-[var(--color-attention-bg)] p-3 text-sm text-[var(--color-attention-text)]">{failure}</p>}
      <Card className="border-l-4 border-l-brand-primary">
        <h2 className="mb-2 flex items-center gap-2 text-lg"><RouteIcon aria-hidden="true" className="size-5" />Reglas de la ruta</h2>
        <p className="mb-0 text-sm">Elige el periodo del plan y los ejercicios de cada día. Un ejercicio puede repetirse. El paciente hace un día por fecha: el día siguiente se habilita al día calendario siguiente. Solo se pueden eliminar o reemplazar ejercicios no completados.</p>
      </Card>

      {!route && <>
        <Card>
          <h2 className="flex items-center gap-2 text-xl"><CalendarDays aria-hidden="true" className="size-5" />Periodo del plan</h2>
          <div role="radiogroup" aria-label="Periodo del plan" className="flex flex-wrap gap-2">
            {PERIODS.map((option) => (
              <button key={option.value} type="button" role="radio" aria-checked={period === option.value} onClick={() => choosePeriod(option.value)}
                className={cn('min-h-11 rounded-xl border px-4 text-sm font-semibold', period === option.value ? 'border-brand-primary bg-brand-primary text-white' : 'border-[var(--color-border)] bg-white hover:bg-purple-50')}>
                {option.label}{option.value > 1 ? ` · ${option.value} días` : ''}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl">Borrador de ruta</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Nivel del paciente: {level}. Elige un día para editar sus ejercicios.</p>
          {period > 1 && (
            <div className="mb-4 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10" aria-label="Días del plan">
              {plan.map((items, index) => (
                <button key={index} type="button" onClick={() => setDay(index)} aria-pressed={day === index} aria-label={`Día ${index + 1}, ${items.length} ejercicios`}
                  className={cn('flex min-h-14 flex-col items-center justify-center rounded-xl border text-xs font-semibold',
                    day === index ? 'border-brand-primary bg-purple-100 text-brand-heading' : items.length ? 'border-[var(--color-border)] bg-white' : 'border-dashed border-[var(--color-attention-text)] bg-[var(--color-attention-bg)] text-[var(--color-attention-text)]')}>
                  <span>Día {index + 1}</span><span className="font-normal">{items.length}</span>
                </button>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-[var(--color-border)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="mb-0 text-lg">Día {day + 1}</h3>
              {period > 1 && dayItems.length > 0 && <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPlan((current) => copyDay(current, day, true))}><Copy aria-hidden="true" className="size-4" />Copiar a días vacíos</Button>
                <Button size="sm" variant="secondary" onClick={() => setPlan((current) => copyDay(current, day, false))}><Copy aria-hidden="true" className="size-4" />Copiar a todos</Button>
              </div>}
            </div>
            {dayItems.length === 0 && <EmptyState title="Este día no tiene ejercicios" description="Elige ejercicios activos cuyo nivel no supere el del paciente." />}
            <ol className="space-y-2 pl-6">{dayItems.map((exerciseId, index) => (
              <li key={`${exerciseId}-${index}`} className="rounded-xl bg-purple-50 p-3">
                <div className="flex items-center justify-between gap-3"><span>{index + 1}. {exerciseName(exerciseId)} <span className="text-xs text-[var(--color-text-muted)]">· {exerciseKind(exerciseId)}</span></span>
                  <span className="flex gap-1">
                    <Button aria-label={`Subir ${exerciseName(exerciseId)}`} size="sm" variant="secondary" disabled={index === 0} onClick={() => updateDay(day, move(dayItems, index, index - 1))}><ArrowUp aria-hidden="true" className="size-4" /></Button>
                    <Button aria-label={`Bajar ${exerciseName(exerciseId)}`} size="sm" variant="secondary" disabled={index === dayItems.length - 1} onClick={() => updateDay(day, move(dayItems, index, index + 1))}><ArrowDown aria-hidden="true" className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => updateDay(day, dayItems.filter((_, position) => position !== index))}>Quitar</Button>
                  </span>
                </div>
              </li>
            ))}</ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Select aria-label={`Ejercicio para agregar al día ${day + 1}`} value={addId} onChange={(event) => setAddId(event.target.value)} className="max-w-md"><option value="">Selecciona un ejercicio</option>{addable.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre} · {gameTypeLabel(exercise.tipo)} · Nivel {exercise.nivel_dificultad}</option>)}</Select>
              <Button variant="secondary" disabled={!addId} onClick={() => { updateDay(day, [...dayItems, addId]); setAddId('') }}>Agregar al día {day + 1}</Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="mb-0 text-sm text-[var(--color-text-muted)]">
              {planToSteps(plan).length} ejercicios en {period} {period === 1 ? 'día' : 'días'}.
              {missing.length > 0 && <> Faltan ejercicios en {missing.length === 1 ? 'el día' : 'los días'} {missing.join(', ')}.</>}
            </p>
            <Button disabled={missing.length > 0 || createMutation.isPending} onClick={() => void perform(() => createMutation.mutateAsync())}>Crear ruta</Button>
          </div>
        </Card>
        <Card><h2 className="text-lg">Fuera de nivel</h2>{excluded.length === 0 ? <p className="mb-0 text-sm text-[var(--color-text-muted)]">No hay ejercicios activos de nivel superior.</p> : <ul className="space-y-2">{excluded.map((exercise, i) => <li key={exercise.id ?? i} className="flex justify-between gap-3 text-sm"><span>{display(exercise.nombre)}</span><Badge variant="attention">Nivel {exercise.nivel_dificultad} supera nivel {level}</Badge></li>)}</ul>}</Card>
      </>}

      {route && <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="mb-0 text-xl">Ruta activa{routeDuration ? ` · ${routeDuration} ${routeDuration === 1 ? 'día' : 'días'}` : ''}</h2><Badge variant="success">Activa</Badge></div>
        {progressQuery.isPending && <SectionSkeleton title="progreso de ruta" />}
        {progressQuery.isError && <ErrorState message={progressQuery.error.message} action={<Button variant="secondary" onClick={() => void progressQuery.refetch()}>Reintentar</Button>} />}
        {progressQuery.data && <p className="text-sm">Progreso: <strong>{Math.round(progressQuery.data.porcentaje ?? 0)}%</strong> · {progressQuery.data.completados ?? 0} completados</p>}
        {agenda && !agenda.completada && <p className="text-sm">Día en curso: <strong>Día {agenda.dia_actual}</strong>{agenda.disponible ? ' (disponible hoy)' : agenda.disponible_desde ? ` · se habilita el ${formatDate(agenda.disponible_desde)}` : ''}</p>}
        <div className="space-y-4">{routeDays.map((dayNumber) => (
          <section key={dayNumber} aria-label={`Día ${dayNumber}`}>
            <h3 className="mb-2 text-base">Día {dayNumber}</h3>
            <ol className="space-y-3 pl-6">{routeSteps.filter((step) => (step.dia ?? 1) === dayNumber).map((step, index) => {
              const replaced = step.estado === 'Reemplazado'
              const completed = step.estado === 'Completado'
              const isCurrent = !replaced && !completed && routeSteps.filter((candidate) => (candidate.orden ?? 0) < (step.orden ?? 0) && candidate.estado === 'Pendiente').length === 0
              const label = replaced ? 'Reemplazado' : completed ? 'Completado' : isCurrent ? 'En curso' : 'Pendiente'
              const variant = completed ? 'success' : replaced ? 'neutral' : 'pending'
              const stepId = step.id
              return <li key={step.id ?? `${step.ejercicio_id}-${index}`} className={`rounded-xl border border-[var(--color-border)] p-3 ${replaced ? 'opacity-70' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={replaced ? 'line-through' : ''}>{step.orden ?? index + 1}. {exerciseName(step.ejercicio_id)} <span className="text-xs text-[var(--color-text-muted)]">· {exerciseKind(step.ejercicio_id)}</span></span><Badge variant={variant}>{label}</Badge>
                </div>
                {!completed && !replaced && stepId && <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDeleteTarget({ stepId, name: exerciseName(step.ejercicio_id) })}>Eliminar</Button>
                  <Select aria-label={`Reemplazar ${exerciseName(step.ejercicio_id)}`} value={replaceTarget?.stepId === stepId ? replaceTarget.nextId : ''} onChange={(event) => setReplaceTarget(event.target.value ? { stepId, exerciseId: step.ejercicio_id ?? '', nextId: event.target.value } : null)} className="max-w-sm"><option value="">Elegir reemplazo…</option>{addable.filter((exercise) => exercise.id !== step.ejercicio_id).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre} · Nivel {exercise.nivel_dificultad}</option>)}</Select>
                  {replaceTarget?.stepId === stepId && <Button size="sm" onClick={() => setConfirmReplace(true)}>Reemplazar</Button>}
                </div>}
              </li>
            })}</ol>
          </section>
        ))}</div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Select aria-label="Ejercicio para agregar al final" value={addId} onChange={(event) => setAddId(event.target.value)} className="max-w-sm"><option value="">Agregar ejercicio…</option>{addable.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre} · Nivel {exercise.nivel_dificultad}</option>)}</Select>
          <Select aria-label="Día al que se agrega" value={String(addDay ?? lastDay)} onChange={(event) => setAddDay(Number(event.target.value))} className="max-w-[10rem]">
            <option value={lastDay}>Día {lastDay}</option>
            {(routeDuration === null || lastDay < routeDuration) && <option value={lastDay + 1}>Día {lastDay + 1} (nuevo)</option>}
          </Select>
          <Button variant="secondary" disabled={!addId || addMutation.isPending} onClick={() => void perform(() => addMutation.mutateAsync())}>Agregar ejercicio</Button>
        </div>
      </Card>}

      {pendingPeriod && <Dialog title="Cambiar el periodo" description={`Los días ${daysLostOnResize(plan, pendingPeriod).join(', ')} tienen ejercicios y se quitarán del borrador.`} onClose={() => setPendingPeriod(null)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPendingPeriod(null)}>Cancelar</Button><Button onClick={() => applyPeriod(pendingPeriod)}>Cambiar periodo</Button></div>
      </Dialog>}
      {deleteTarget && <Dialog title="Eliminar ejercicio de la ruta" description={`¿Eliminar “${deleteTarget.name}”? Esta acción no se puede deshacer.`} onClose={() => setDeleteTarget(null)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button onClick={() => void perform(async () => { await deleteMutation.mutateAsync(); setDeleteTarget(null) })} disabled={deleteMutation.isPending}>Eliminar</Button></div>
      </Dialog>}
      {confirmReplace && replaceTarget && <Dialog title="Reemplazar ejercicio de la ruta" description={`Se reemplazará “${exerciseName(replaceTarget.exerciseId)}” por “${exerciseName(replaceTarget.nextId)}”. Esta acción no se puede deshacer.`} onClose={() => setConfirmReplace(false)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmReplace(false)}>Cancelar</Button><Button onClick={() => void perform(async () => { await replaceMutation.mutateAsync(); setConfirmReplace(false); setReplaceTarget(null) })} disabled={replaceMutation.isPending}>Confirmar reemplazo</Button></div>
      </Dialog>}
    </div>
  )
}
