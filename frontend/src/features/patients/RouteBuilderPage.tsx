import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Route as RouteIcon } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Select } from '../../components/ui/Select'
import { display } from '../../lib/text'
import { SectionSkeleton } from './PatientStates'
import {
  addRouteExercise, createRoute, deleteRouteExercise, getActiveRoute, getExercises, getPatient,
  getRouteProgress, replaceRouteExercise,
} from './api'

export function RouteBuilderPage() {
  const { id = '' } = useParams()
  const client = useQueryClient()
  const [draft, setDraft] = useState<string[]>([])
  const [addId, setAddId] = useState('')
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
  const stepExercises = (routeQuery.data?.ejercicios ?? []).filter((step) => step.estado !== 'Reemplazado')
  const selectedIds = routeQuery.data
    ? new Set((routeQuery.data.ejercicios ?? []).map((step) => step.ejercicio_id).filter((value): value is string => Boolean(value)))
    : new Set(draft)
  const addable = available.filter((exercise) => exercise.id && !selectedIds.has(exercise.id))
  const routeSteps = routeQuery.data?.ejercicios ?? []

  const invalidateRouteData = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.patients.route(id) }),
      client.invalidateQueries({ queryKey: queryKeys.patients.routeProgress(routeId) }),
      client.invalidateQueries({ queryKey: queryKeys.patients.routesAll(id) }),
      client.invalidateQueries({ queryKey: queryKeys.patients.detail(id) }),
      client.invalidateQueries({ queryKey: queryKeys.patients.all }),
    ])
  }
  const createMutation = useMutation({ mutationFn: () => createRoute(id, draft.map((ejercicio_id, index) => ({ ejercicio_id, orden: index + 1 }))), onSuccess: invalidateRouteData })
  const addMutation = useMutation({ mutationFn: () => addRouteExercise(routeId, addId, stepExercises.length + 1), onSuccess: async () => { setAddId(''); await invalidateRouteData() } })
  const deleteMutation = useMutation({ mutationFn: () => deleteRouteExercise(routeId, deleteTarget!.stepId), onSuccess: invalidateRouteData })
  const replaceMutation = useMutation({ mutationFn: () => replaceRouteExercise(routeId, replaceTarget!.stepId, replaceTarget!.nextId), onSuccess: invalidateRouteData })

  async function perform(action: () => Promise<unknown>) {
    setFailure('')
    try { await action() } catch (error) { setFailure(getErrorMessage(error)) }
  }
  function exerciseName(exerciseId: string | undefined) {
    return exercises.find((exercise) => exercise.id === exerciseId)?.nombre ?? 'Ejercicio no disponible'
  }
  if (patientQuery.isPending || routeQuery.isPending || exercisesQuery.isPending) return <div className="space-y-4"><SectionSkeleton title="constructor de ruta" /><SectionSkeleton title="ejercicios disponibles" /></div>
  if (patientQuery.isError || routeQuery.isError || exercisesQuery.isError) {
    const error = patientQuery.error ?? routeQuery.error ?? exercisesQuery.error
    const retry = () => { void patientQuery.refetch(); void routeQuery.refetch(); void exercisesQuery.refetch() }
    return <ErrorState title="No se pudo cargar el constructor de ruta" message={error?.message ?? 'Ocurrió un error inesperado.'} action={<Button variant="secondary" onClick={retry}>Reintentar</Button>} />
  }
  const route = routeQuery.data

  return (
    <div className="space-y-6">
      <Link to={`/especialista/pacientes/${id}`}>← Volver al paciente</Link>
      <header><p className="mb-1 text-sm font-semibold text-brand-primary">AiKO · Especialista</p><h1 className="mb-0 text-3xl">Ruta de {patientQuery.data.nombre}</h1></header>
      {failure && <p role="alert" className="rounded-xl bg-[var(--color-attention-bg)] p-3 text-sm text-[var(--color-attention-text)]">{failure}</p>}
      <Card className="border-l-4 border-l-brand-primary">
        <h2 className="mb-2 flex items-center gap-2 text-lg"><RouteIcon aria-hidden="true" className="size-5" />Reglas de la ruta</h2>
        <p className="mb-0 text-sm">Solo se pueden eliminar o reemplazar ejercicios no completados. El orden es consecutivo y no se repiten ejercicios.</p>
      </Card>

      {!route && <>
        <Card>
          <h2 className="text-xl">Borrador de ruta</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Nivel del paciente: {level}. El orden se guarda desde 1 sin saltos.</p>
          {draft.length === 0 && <EmptyState title="Aún no agregas ejercicios" description="Elige ejercicios activos cuyo nivel no supere el del paciente." />}
          <ol className="space-y-2 pl-6">{draft.map((exerciseId, index) => (
            <li key={exerciseId} className="rounded-xl bg-purple-50 p-3">
              <div className="flex items-center justify-between gap-3"><span>{index + 1}. {exerciseName(exerciseId)}</span>
                <span className="flex gap-1"><Button aria-label={`Subir ${exerciseName(exerciseId)}`} size="sm" variant="secondary" disabled={index === 0} onClick={() => setDraft((ids) => reorder(ids, index, index - 1))}><ArrowUp aria-hidden="true" className="size-4" /></Button><Button aria-label={`Bajar ${exerciseName(exerciseId)}`} size="sm" variant="secondary" disabled={index === draft.length - 1} onClick={() => setDraft((ids) => reorder(ids, index, index + 1))}><ArrowDown aria-hidden="true" className="size-4" /></Button><Button size="sm" variant="ghost" onClick={() => setDraft((ids) => ids.filter((item) => item !== exerciseId))}>Quitar</Button></span>
              </div>
            </li>
          ))}</ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Select aria-label="Ejercicio para agregar" value={addId} onChange={(event) => setAddId(event.target.value)} className="max-w-md"><option value="">Selecciona un ejercicio</option>{available.filter((exercise) => exercise.id && !draft.includes(exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre} · Nivel {exercise.nivel_dificultad}</option>)}</Select>
            <Button variant="secondary" disabled={!addId} onClick={() => { setDraft((ids) => [...ids, addId]); setAddId('') }}>Agregar al borrador</Button>
            <Button disabled={draft.length === 0 || createMutation.isPending} onClick={() => void perform(() => createMutation.mutateAsync())}>Crear ruta</Button>
          </div>
        </Card>
        <Card><h2 className="text-lg">Fuera de nivel</h2>{excluded.length === 0 ? <p className="mb-0 text-sm text-[var(--color-text-muted)]">No hay ejercicios activos de nivel superior.</p> : <ul className="space-y-2">{excluded.map((exercise, i) => <li key={exercise.id ?? i} className="flex justify-between gap-3 text-sm"><span>{display(exercise.nombre)}</span><Badge variant="attention">Nivel {exercise.nivel_dificultad} supera nivel {level}</Badge></li>)}</ul>}</Card>
      </>}

      {route && <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="mb-0 text-xl">Ruta activa</h2><Badge variant="success">Activa</Badge></div>
        {progressQuery.isPending && <SectionSkeleton title="progreso de ruta" />}
        {progressQuery.isError && <ErrorState message={progressQuery.error.message} action={<Button variant="secondary" onClick={() => void progressQuery.refetch()}>Reintentar</Button>} />}
        {progressQuery.data && <p className="text-sm">Progreso: <strong>{progressQuery.data.porcentaje ?? 0}%</strong> · {progressQuery.data.completados ?? 0} completados</p>}
        <ol className="space-y-3 pl-6">{routeSteps.map((step, index) => {
          const replaced = step.estado === 'Reemplazado'
          const completed = step.estado === 'Completado'
          const firstPending = !replaced && !completed && routeSteps.filter((candidate, i) => i < index && candidate.estado !== 'Reemplazado' && candidate.estado !== 'Completado').length === 0
          const label = replaced ? 'Reemplazado' : completed ? 'Completado' : firstPending ? 'En curso' : 'Pendiente'
          const variant = completed ? 'success' : label === 'En curso' ? 'pending' : replaced ? 'neutral' : 'pending'
          const stepId = step.id
          return <li key={step.id ?? `${step.ejercicio_id}-${index}`} className={`rounded-xl border border-[var(--color-border)] p-3 ${replaced ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={replaced ? 'line-through' : ''}>{step.orden ?? index + 1}. {exerciseName(step.ejercicio_id)}</span><Badge variant={variant}>{label}</Badge>
            </div>
            {!completed && !replaced && stepId && <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDeleteTarget({ stepId, name: exerciseName(step.ejercicio_id) })}>Eliminar</Button>
              <Select aria-label={`Reemplazar ${exerciseName(step.ejercicio_id)}`} value={replaceTarget?.stepId === stepId ? replaceTarget.nextId : ''} onChange={(event) => setReplaceTarget(event.target.value ? { stepId, exerciseId: step.ejercicio_id ?? '', nextId: event.target.value } : null)} className="max-w-sm"><option value="">Elegir reemplazo…</option>{available.filter((exercise) => exercise.id && !selectedIds.has(exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre} · Nivel {exercise.nivel_dificultad}</option>)}</Select>
              {replaceTarget?.stepId === stepId && <Button size="sm" onClick={() => setConfirmReplace(true)}>Reemplazar</Button>}
            </div>}
          </li>
        })}</ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Select aria-label="Ejercicio para agregar al final" value={addId} onChange={(event) => setAddId(event.target.value)} className="max-w-sm"><option value="">Agregar ejercicio al final…</option>{addable.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre} · Nivel {exercise.nivel_dificultad}</option>)}</Select>
          <Button variant="secondary" disabled={!addId || addMutation.isPending} onClick={() => void perform(() => addMutation.mutateAsync())}>Agregar ejercicio al final</Button>
        </div>
      </Card>}

      {deleteTarget && <Dialog title="Eliminar ejercicio de la ruta" description={`¿Eliminar “${deleteTarget.name}”? Esta acción no se puede deshacer.`} onClose={() => setDeleteTarget(null)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button onClick={() => void perform(async () => { await deleteMutation.mutateAsync(); setDeleteTarget(null) })} disabled={deleteMutation.isPending}>Eliminar</Button></div>
      </Dialog>}
      {confirmReplace && replaceTarget && <Dialog title="Reemplazar ejercicio de la ruta" description={`Se reemplazará “${exerciseName(replaceTarget.exerciseId)}” por “${exerciseName(replaceTarget.nextId)}”. Esta acción no se puede deshacer.`} onClose={() => setConfirmReplace(false)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmReplace(false)}>Cancelar</Button><Button onClick={() => void perform(async () => { await replaceMutation.mutateAsync(); setConfirmReplace(false); setReplaceTarget(null) })} disabled={replaceMutation.isPending}>Confirmar reemplazo</Button></div>
      </Dialog>}
    </div>
  )
}

function reorder(items: string[], from: number, to: number): string[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item) next.splice(to, 0, item)
  return next
}
