import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, CalendarDays, Check, Copy, Lock, Plus, Route as RouteIcon } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toastContext'
import { cn } from '../../lib/utils'
import { formatDate } from '../../lib/date'
import { display } from '../../lib/text'
import { formatPercent, roundPercent } from '../../lib/percent'
import { gameTypeLabel } from '../exercises/exerciseTypes'
import { SectionSkeleton } from './PatientStates'
import {
  addRouteExercise, createRoute, deleteRouteExercise, getActiveRoute, getExercises, getPatient,
  getRouteProgress, replaceRouteExercise, type RoutePeriod, type TherapyRoute,
} from './api'
import { islandFor } from './islands'
import { copyDay, daysLostOnResize, emptyDays, move, PERIODS, planToSteps, resizePlan, type DayPlan } from './routePlan'

type Step = NonNullable<TherapyRoute['ejercicios']>[number]

/**
 * Editor de la ruta terapéutica. Es el mismo al crear una ruta y al editar
 * la activa: días como islas, y en cada día sus ejercicios. Al crear, todo
 * es un borrador hasta "Crear ruta"; al editar, cada cambio se guarda.
 */
export function RouteBuilderPage() {
  const { id = '' } = useParams()
  const client = useQueryClient()
  const { notify } = useToast()
  const [period, setPeriod] = useState<RoutePeriod>(1)
  const [plan, setPlan] = useState<DayPlan>([[]])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [pendingPeriod, setPendingPeriod] = useState<RoutePeriod | null>(null)
  const [addId, setAddId] = useState('')
  const [replaceTarget, setReplaceTarget] = useState<{ stepId: string; exerciseId: string; nextId: string } | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ stepId: string; name: string } | null>(null)
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

  const route = routeQuery.data ?? null
  const editing = Boolean(route)
  const routeSteps = route?.ejercicios ?? []
  const currentSteps = routeSteps.filter((step) => step.estado !== 'Reemplazado')
  const lastDay = currentSteps.reduce((max, step) => Math.max(max, step.dia ?? 1), 1)
  const routeDuration = route?.duracion_dias ?? null
  const firstPendingDay = currentSteps.filter((step) => step.estado === 'Pendiente').reduce((min, step) => Math.min(min, step.dia ?? 1), Number.POSITIVE_INFINITY)
  const currentDay = Number.isFinite(firstPendingDay) ? firstPendingDay : lastDay
  // Días del editor: al crear, los del periodo; al editar, los de la ruta
  // (y uno nuevo al final si la ruta no tiene duración fija).
  const dayCount = editing ? (routeDuration ?? lastDay + 1) : period
  const day = Math.min(selectedDay ?? (editing ? currentDay : 1), dayCount)
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
    mutationFn: (target: { exerciseId: string; day: number }) => addRouteExercise(routeId, target.exerciseId, currentSteps.length + 1, target.day),
    onSuccess: async () => { setAddId(''); await invalidateRouteData() },
  })
  const deleteMutation = useMutation({ mutationFn: () => deleteRouteExercise(routeId, deleteTarget!.stepId), onSuccess: invalidateRouteData })
  const replaceMutation = useMutation({ mutationFn: () => replaceRouteExercise(routeId, replaceTarget!.stepId, replaceTarget!.nextId), onSuccess: invalidateRouteData })

  async function perform(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action()
      notify({ type: 'success', message: successMessage })
    } catch (error) { notify({ type: 'error', message: getErrorMessage(error) }) }
  }
  const exerciseOf = (exerciseId: string | undefined) => exercises.find((exercise) => exercise.id === exerciseId)
  const exerciseName = (exerciseId: string | undefined) => exerciseOf(exerciseId)?.nombre ?? 'Ejercicio no disponible'
  const exerciseKind = (exerciseId: string | undefined) => gameTypeLabel(exerciseOf(exerciseId)?.tipo)
  function applyPeriod(next: RoutePeriod) {
    setPeriod(next)
    setPlan((current) => resizePlan(current, next))
    setSelectedDay((current) => Math.min(current ?? 1, next))
    setPendingPeriod(null)
  }
  function choosePeriod(next: RoutePeriod) {
    if (daysLostOnResize(plan, next).length) setPendingPeriod(next)
    else applyPeriod(next)
  }
  const updateDay = (index: number, items: string[]) => setPlan((current) => current.map((dayItems, i) => (i === index ? items : dayItems)))
  const stepsOfDay = (n: number) => routeSteps.filter((step) => (step.dia ?? 1) === n).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  if (patientQuery.isPending || routeQuery.isPending || exercisesQuery.isPending) return <div className="space-y-4"><SectionSkeleton title="editor de ruta" /><SectionSkeleton title="ejercicios disponibles" /></div>
  if (patientQuery.isError || routeQuery.isError || exercisesQuery.isError) {
    const error = patientQuery.error ?? routeQuery.error ?? exercisesQuery.error
    const retry = () => { void patientQuery.refetch(); void routeQuery.refetch(); void exercisesQuery.refetch() }
    return <ErrorState title="No pudimos cargar la ruta. Inténtalo de nuevo." message={error?.message ?? 'Ocurrió un error inesperado.'} action={<Button variant="secondary" onClick={retry}>Intentar de nuevo</Button>} />
  }

  const days = Array.from({ length: dayCount }, (_, index) => index + 1)
  const draftItems = plan[day - 1] ?? []
  const editSteps = stepsOfDay(day)
  const dayLocked = editing && day < currentDay
  const agenda = route?.agenda
  const percent = progressQuery.data?.porcentaje ?? null

  function addToDay() {
    if (!addId) return
    if (!editing) {
      updateDay(day - 1, [...draftItems, addId])
      setAddId('')
      return
    }
    void perform(() => addMutation.mutateAsync({ exerciseId: addId, day }), `Ejercicio agregado al día ${day}.`)
  }

  return (
    <div className="rise-stagger space-y-6">
      <PageHeader
        title={`Ruta de ${patientQuery.data.nombre}`}
        description={editing ? `Edita la ruta activa de ${patientQuery.data.nombre}, día por día.` : `Arma la ruta de ${patientQuery.data.nombre}, día por día.`}
        backTo={`/especialista/pacientes/${id}`}
        backLabel="Volver al paciente"
      />

      <Card className="border-l-4 border-l-brand-primary">
        <h2 className="mb-2 flex items-center gap-2 text-lg"><RouteIcon aria-hidden="true" className="size-5" />Reglas de la ruta</h2>
        <p className="mb-0 text-sm">Cada día es una isla con sus ejercicios; un ejercicio puede repetirse. El paciente hace un día por fecha: el siguiente se habilita al día calendario siguiente. En una ruta activa puedes agregar ejercicios desde el día en curso, y quitar o reemplazar los que aún no ha completado.</p>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-xl"><CalendarDays aria-hidden="true" className="size-5" />{editing ? 'Ruta activa' : 'Periodo del plan'}</h2>
            <p className="mb-0 text-sm text-[var(--color-text-muted)]">
              Nivel del paciente: {level}.{' '}
              {editing
                ? <>{routeDuration ? `${routeDuration} ${routeDuration === 1 ? 'día' : 'días'}. ` : ''}{agenda && !agenda.completada ? <>Día en curso: <strong>Día {agenda.dia_actual}</strong>{agenda.disponible ? ' (disponible hoy)' : agenda.disponible_desde ? ` · se habilita el ${formatDate(agenda.disponible_desde)}` : ''}.</> : null}</>
                : 'Elige cuántos días dura y luego los ejercicios de cada día.'}
            </p>
          </div>
          {editing ? <Badge variant="success">Activa</Badge> : (
            <div role="radiogroup" aria-label="Periodo del plan" className="flex flex-wrap gap-2">
              {PERIODS.map((option) => (
                <button key={option.value} type="button" role="radio" aria-checked={period === option.value} onClick={() => choosePeriod(option.value)}
                  className={cn('min-h-11 rounded-xl border px-4 text-sm font-semibold transition-all duration-200', period === option.value ? 'scale-105 border-brand-primary bg-brand-primary text-white shadow-md' : 'border-[var(--color-border)] bg-white hover:-translate-y-px hover:bg-purple-50')}>
                  {option.label}{option.value > 1 ? ` · ${option.value} días` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {editing && percent !== null && (
          <div className="mb-5">
            <div className="mb-1 flex justify-between text-sm"><span>Progreso</span><strong>{formatPercent(percent)} · {progressQuery.data?.completados ?? 0} completados</strong></div>
            <div role="progressbar" aria-label={`Progreso de la ruta: ${formatPercent(percent)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundPercent(percent)} className="h-3 overflow-hidden rounded-full bg-purple-100">
              <div className="bar-fill h-full rounded-full [background-image:var(--gradient-primary-accessible)]" style={{ width: `${roundPercent(percent)}%` }} />
            </div>
          </div>
        )}

        {dayCount > 1 && (
          <div className="mb-5 flex gap-3 overflow-x-auto pb-2" aria-label="Días de la ruta">
            {days.map((n) => {
              const items = editing ? stepsOfDay(n).filter((step) => step.estado !== 'Reemplazado') : (plan[n - 1] ?? [])
              const count = items.length
              const types = editing ? (items as Step[]).map((step) => step.ejercicio?.tipo ?? exerciseOf(step.ejercicio_id)?.tipo) : (items as string[]).map((exerciseId) => exerciseOf(exerciseId)?.tipo)
              const done = editing && count > 0 && (items as Step[]).every((step) => step.estado === 'Completado')
              const past = editing && n < currentDay
              const empty = count === 0
              const isNew = editing && routeDuration === null && n === dayCount
              return (
                <button key={n} type="button" onClick={() => setSelectedDay(n)} aria-pressed={day === n}
                  aria-label={`Día ${n}${isNew ? ' (nuevo)' : ''}, ${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}${done ? ', completado' : ''}`}
                  className={cn('group flex w-24 shrink-0 flex-col items-center rounded-2xl border-2 p-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-1',
                    day === n ? 'border-brand-primary bg-purple-100 shadow-md' : empty && !editing ? 'border-dashed border-[var(--color-attention-text)] bg-[var(--color-attention-bg)] text-[var(--color-attention-text)]' : 'border-transparent bg-[var(--color-surface-soft)]')}>
                  <img src={islandFor(types, n).image} alt="" className={cn('h-12 w-16 object-contain transition-transform duration-300 group-hover:scale-110', (empty || (past && !done)) && 'opacity-50 grayscale')} />
                  <span className="mt-1 inline-flex items-center gap-1">{done ? <Check aria-hidden="true" className="size-3" /> : past ? <Lock aria-hidden="true" className="size-3" /> : null}Día {n}</span>
                  <span className="font-normal">{isNew ? 'nuevo' : count}</span>
                </button>
              )
            })}
          </div>
        )}

        <div key={day} className="unfold rounded-2xl border border-[var(--color-border)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="mb-0 text-lg">Día {day}</h3>
            {!editing && period > 1 && draftItems.length > 0 && <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPlan((current) => copyDay(current, day - 1, true))}><Copy aria-hidden="true" className="size-4" />Copiar a días vacíos</Button>
              <Button size="sm" variant="secondary" onClick={() => setPlan((current) => copyDay(current, day - 1, false))}><Copy aria-hidden="true" className="size-4" />Copiar a todos</Button>
            </div>}
          </div>

          {!editing && (
            <>
              {draftItems.length === 0 && <EmptyState title="Este día aún no tiene ejercicios." description="Elige ejercicios activos adecuados para el nivel del paciente." />}
              <ol className="list-stagger space-y-2 pl-0">{draftItems.map((exerciseId, index) => (
                <li key={`${exerciseId}-${index}`} className="list-none rounded-xl bg-purple-50 p-3">
                  <div className="flex items-center justify-between gap-3"><span>{index + 1}. {exerciseName(exerciseId)} <span className="text-xs text-[var(--color-text-muted)]">· {exerciseKind(exerciseId)}</span></span>
                    <span className="flex gap-1">
                      <Button aria-label={`Subir ${exerciseName(exerciseId)}`} size="sm" variant="secondary" disabled={index === 0} onClick={() => updateDay(day - 1, move(draftItems, index, index - 1))}><ArrowUp aria-hidden="true" className="size-4" /></Button>
                      <Button aria-label={`Bajar ${exerciseName(exerciseId)}`} size="sm" variant="secondary" disabled={index === draftItems.length - 1} onClick={() => updateDay(day - 1, move(draftItems, index, index + 1))}><ArrowDown aria-hidden="true" className="size-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => updateDay(day - 1, draftItems.filter((_, position) => position !== index))}>Quitar</Button>
                    </span>
                  </div>
                </li>
              ))}</ol>
            </>
          )}

          {editing && (
            <>
              {editSteps.length === 0 && <EmptyState title="Este día aún no tiene ejercicios." description={dayLocked ? 'Este día ya pasó.' : 'Agrega ejercicios para este día.'} />}
              <ol className="list-stagger space-y-3 pl-0">{editSteps.map((step, index) => {
                const replaced = step.estado === 'Reemplazado'
                const completed = step.estado === 'Completado'
                const isCurrent = !replaced && !completed && routeSteps.filter((candidate) => (candidate.orden ?? 0) < (step.orden ?? 0) && candidate.estado === 'Pendiente').length === 0
                const label = replaced ? 'Reemplazado' : completed ? 'Completado' : isCurrent ? 'En curso' : 'Pendiente'
                const variant = completed ? 'success' : replaced ? 'neutral' : 'pending'
                const stepId = step.id
                return <li key={step.id ?? `${step.ejercicio_id}-${index}`} className={cn('list-none rounded-xl border border-[var(--color-border)] p-3', replaced && 'opacity-70', isCurrent && 'border-brand-primary bg-purple-50/60')}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className={replaced ? 'line-through' : ''}>{index + 1}. {exerciseName(step.ejercicio_id)} <span className="text-xs text-[var(--color-text-muted)]">· {exerciseKind(step.ejercicio_id)}</span></span><Badge variant={variant}>{label}</Badge>
                  </div>
                  {!completed && !replaced && stepId && <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setDeleteTarget({ stepId, name: exerciseName(step.ejercicio_id) })}>Eliminar</Button>
                    <Select aria-label={`Reemplazar ${exerciseName(step.ejercicio_id)}`} value={replaceTarget?.stepId === stepId ? replaceTarget.nextId : ''} onChange={(event) => setReplaceTarget(event.target.value ? { stepId, exerciseId: step.ejercicio_id ?? '', nextId: event.target.value } : null)} className="max-w-sm"><option value="">Elegir reemplazo…</option>{addable.filter((exercise) => exercise.id !== step.ejercicio_id).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre} · Nivel {exercise.nivel_dificultad}</option>)}</Select>
                    {replaceTarget?.stepId === stepId && <Button size="sm" onClick={() => setConfirmReplace(true)}>Reemplazar</Button>}
                  </div>}
                </li>
              })}</ol>
            </>
          )}

          {dayLocked ? (
            <p className="mb-0 mt-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><Lock aria-hidden="true" className="size-4" />Este día ya pasó: no se le pueden agregar ejercicios.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <Select aria-label={`Ejercicio para agregar al día ${day}`} value={addId} onChange={(event) => setAddId(event.target.value)} className="max-w-md"><option value="">Selecciona un ejercicio</option>{addable.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre} · {gameTypeLabel(exercise.tipo)} · Nivel {exercise.nivel_dificultad}</option>)}</Select>
              <Button variant="secondary" disabled={!addId || addMutation.isPending} onClick={addToDay}><Plus aria-hidden="true" className="size-4" />Agregar al día {day}</Button>
            </div>
          )}
        </div>

        {!editing && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="mb-0 text-sm text-[var(--color-text-muted)]">
              {planToSteps(plan).length} ejercicios en {period} {period === 1 ? 'día' : 'días'}.
              {missing.length > 0 && <> Faltan ejercicios en {missing.length === 1 ? 'el día' : 'los días'} {missing.join(', ')}.</>}
            </p>
            <Button disabled={missing.length > 0 || createMutation.isPending} onClick={() => void perform(() => createMutation.mutateAsync(), 'Ruta creada correctamente.')}>Crear ruta</Button>
          </div>
        )}
      </Card>

      <Card><h2 className="text-lg">Fuera de nivel</h2>{excluded.length === 0 ? <p className="mb-0 text-sm text-[var(--color-text-muted)]">No hay ejercicios activos de nivel superior.</p> : <ul className="space-y-2">{excluded.map((exercise, i) => <li key={exercise.id ?? i} className="flex justify-between gap-3 text-sm"><span>{display(exercise.nombre)}</span><Badge variant="attention">Nivel {exercise.nivel_dificultad} supera nivel {level}</Badge></li>)}</ul>}</Card>

      {pendingPeriod && <Dialog title="¿Cambiar el periodo?" description={`Se quitarán del borrador los ejercicios de los días ${daysLostOnResize(plan, pendingPeriod).join(', ')}.`} onClose={() => setPendingPeriod(null)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPendingPeriod(null)}>Cancelar</Button><Button onClick={() => applyPeriod(pendingPeriod)}>Cambiar periodo</Button></div>
      </Dialog>}
      {deleteTarget && <Dialog title="¿Quieres quitar este ejercicio de la ruta?" description={`No podrás deshacerlo. Ejercicio: “${deleteTarget.name}”.`} onClose={() => setDeleteTarget(null)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button onClick={() => void perform(async () => { await deleteMutation.mutateAsync(); setDeleteTarget(null) }, 'Ejercicio eliminado de la ruta.')} disabled={deleteMutation.isPending}>Eliminar</Button></div>
      </Dialog>}
      {confirmReplace && replaceTarget && <Dialog title="¿Quieres reemplazar este ejercicio?" description={`No podrás deshacerlo. Se cambiará “${exerciseName(replaceTarget.exerciseId)}” por “${exerciseName(replaceTarget.nextId)}”.`} onClose={() => setConfirmReplace(false)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmReplace(false)}>Cancelar</Button><Button onClick={() => void perform(async () => { await replaceMutation.mutateAsync(); setConfirmReplace(false); setReplaceTarget(null) }, 'Ejercicio reemplazado correctamente.')} disabled={replaceMutation.isPending}>Confirmar reemplazo</Button></div>
      </Dialog>}
    </div>
  )
}
