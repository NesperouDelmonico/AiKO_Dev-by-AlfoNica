import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Plus, Store, Undo2 } from 'lucide-react'
import { apiClient, getErrorMessage, requireResponse } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/toastContext'
import type { components } from '../../api/schema'
import { ParamsEditor } from './ParamsEditor'
import {
  CATEGORIES, categoryOf, DEFAULT_TYPE_BY_CATEGORY, formToParams, GAME_TYPES, gamesOf, gameTypeLabel, paramsToForm, type GameType,
} from './exerciseTypes'

type Exercise = components['schemas']['Ejercicio']
type Category = components['schemas']['CategoriaEjercicio']
type ExerciseState = components['schemas']['EstadoEjercicio']
const categories = CATEGORIES

export function ExercisesPage() {
  const client = useQueryClient()
  const { notify } = useToast()
  const [category, setCategory] = useState<Category | ''>('')
  const [state, setState] = useState<ExerciseState | ''>('')
  const [archived, setArchived] = useState(false)
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)
  const filters = useMemo(() => ({ ...(category ? { categoria: category } : {}), ...(state ? { estado: state } : {}) }), [category, state])
  const query = useQuery({
    queryKey: queryKeys.exercises.list({ ...filters, archivados: archived ? 'true' : undefined }),
    queryFn: async () => {
      const result = await apiClient.GET('/ejercicios', { params: { query: { ...filters, ...(archived ? { archivados: true } : {}) } } })
      return requireResponse(result.data, result.response)
    },
  })
  const archive = useMutation({
    mutationFn: async ({ id, restore }: { id: string; restore: boolean }) => {
      const result = restore
        ? await apiClient.PATCH('/ejercicios/{id}/restaurar', { params: { path: { id } } })
        : await apiClient.PATCH('/ejercicios/{id}/archivar', { params: { path: { id } } })
      return requireResponse(result.data, result.response)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.exercises.all }),
  })
  async function changeArchive(exercise: Exercise, restore: boolean) {
    try {
      await archive.mutateAsync({ id: exercise.id!, restore })
      notify({ type: 'success', message: restore
        ? `"${exercise.nombre}" volvió a tu catálogo.`
        : `"${exercise.nombre}" se archivó. Las rutas que ya lo usan siguen igual; puedes restaurarlo desde Archivados.` })
    } catch (error) { notify({ type: 'error', message: getErrorMessage(error) }) }
  }
  const share = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const result = publish
        ? await apiClient.PATCH('/ejercicios/{id}/publicar', { params: { path: { id } } })
        : await apiClient.PATCH('/ejercicios/{id}/retirar', { params: { path: { id } } })
      return requireResponse(result.data, result.response)
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.exercises.all }),
      client.invalidateQueries({ queryKey: queryKeys.workshop.all }),
    ]),
  })
  async function changeShare(exercise: Exercise, publish: boolean) {
    try {
      await share.mutateAsync({ id: exercise.id!, publish })
      notify({ type: 'success', message: publish
        ? `"${exercise.nombre}" ya está en el taller: otros especialistas pueden importarlo.`
        : `"${exercise.nombre}" se retiró del taller. Las copias ya importadas no cambian.` })
    } catch (error) { notify({ type: 'error', message: getErrorMessage(error) }) }
  }
  const toggle = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: ExerciseState }) => {
      const result = await apiClient.PATCH('/ejercicios/{id}/estado', { params: { path: { id } }, body: { estado } })
      return requireResponse(result.data, result.response)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.exercises.all }),
  })
  const items = query.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Ejercicios" description="Tu catálogo personal: solo tú ves y usas estos ejercicios en las rutas de tus pacientes." actions={<Button onClick={() => setEditing('new')}><Plus aria-hidden="true" className="size-4" />Crear ejercicio</Button>} />
      <Card>
        <div role="tablist" aria-label="Vista del catálogo" className="mb-4 inline-flex rounded-xl border border-[var(--color-border)] p-1">
          {([[false, 'Mis ejercicios'], [true, 'Archivados']] as const).map(([value, label]) => (
            <button key={label} type="button" role="tab" aria-selected={archived === value} onClick={() => setArchived(value)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${archived === value ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>{label}</button>
          ))}
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <label htmlFor="exercise-category" className="text-sm font-semibold">Clasificación
            <Select id="exercise-category" className="mt-1" value={category} onChange={(e) => setCategory(e.target.value as Category | '')}><option value="">Todas</option>{categories.map((value) => <option key={value}>{value}</option>)}</Select>
          </label>
          <label htmlFor="exercise-state" className="text-sm font-semibold">Estado
            <Select id="exercise-state" className="mt-1" value={state} onChange={(e) => setState(e.target.value as ExerciseState | '')}><option value="">Todos</option><option>Activo</option><option>Desactivado</option></Select>
          </label>
        </div>
        {query.isPending && <div aria-busy="true" aria-label="Cargando ejercicios" className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton-shimmer h-20 animate-pulse rounded-xl bg-purple-50" />)}</div>}
        {query.isError && <ErrorState title="No pudimos cargar los ejercicios. Inténtalo de nuevo." message={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Intentar de nuevo</Button>} />}
        {query.isSuccess && items.length === 0 && (archived
          ? <EmptyState title="No tienes ejercicios archivados." description="Archiva los que ya no uses para mantener ordenado tu catálogo." />
          : <EmptyState title="No encontramos ejercicios con esos filtros." description="Prueba con otros o crea uno." />)}
        <div className="space-y-6">{categories.filter((value) => !category || value === category).map((group) => {
          const groupItems = items.filter((exercise) => (categoryOf(exercise.tipo) ?? exercise.categoria) === group)
          if (groupItems.length === 0) return null
          return <section key={group} aria-labelledby={`group-${group}`} className="space-y-3">
            <h2 id={`group-${group}`} className="mb-0 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{group} · {groupItems.length}</h2>
            <div className="list-stagger space-y-3">{groupItems.map((exercise, i) => (
          <div key={exercise.id ?? i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4">
            <div><h2 className="mb-1 text-base">{exercise.nombre || '—'}</h2><p className="mb-2 text-sm text-[var(--color-text-muted)]">{gameTypeLabel(exercise.tipo)} · {exercise.categoria || '—'} · Nivel {exercise.nivel_dificultad ?? '—'}</p>{exercise.archivado_en
                ? <Badge variant="neutral">Archivado</Badge>
                : <span className="flex flex-wrap gap-2"><Badge variant={exercise.estado === 'Activo' ? 'success' : 'attention'}>{exercise.estado || 'Estado no disponible'}</Badge>{exercise.publicado && <Badge variant="pending">En el taller</Badge>}{exercise.origen_id && <Badge variant="neutral">Importado del taller</Badge>}</span>}</div>
            {exercise.archivado_en
              ? <div className="flex gap-2">{exercise.id && <Button size="sm" variant="secondary" disabled={archive.isPending} onClick={() => void changeArchive(exercise, true)}><ArchiveRestore aria-hidden="true" className="size-4" />Restaurar</Button>}</div>
                      : <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => setEditing(exercise)}>Editar</Button>{exercise.id && <Button size="sm" variant="secondary" disabled={toggle.isPending} onClick={async () => {
                        const nextState = exercise.estado === 'Activo' ? 'Desactivado' : 'Activo'
                        try {
                          await toggle.mutateAsync({ id: exercise.id!, estado: nextState })
                          notify({ type: 'success', message: `Ejercicio ${nextState === 'Activo' ? 'activado' : 'desactivado'} correctamente.` })
                        } catch (error) { notify({ type: 'error', message: getErrorMessage(error) }) }
                      }}>{exercise.estado === 'Activo' ? 'Desactivar' : 'Activar'}</Button>}{exercise.id && (exercise.publicado
                        ? <Button size="sm" variant="secondary" aria-label={`Retirar ${exercise.nombre ?? 'ejercicio'} del taller`} disabled={share.isPending} onClick={() => void changeShare(exercise, false)}><Undo2 aria-hidden="true" className="size-4" />Retirar del taller</Button>
                        : <Button size="sm" variant="secondary" aria-label={`Publicar ${exercise.nombre ?? 'ejercicio'} en el taller`} disabled={share.isPending || exercise.estado !== 'Activo'} title={exercise.estado !== 'Activo' ? 'Activa el ejercicio para publicarlo' : undefined} onClick={() => void changeShare(exercise, true)}><Store aria-hidden="true" className="size-4" />Publicar en el taller</Button>)}{exercise.id && <Button size="sm" variant="secondary" aria-label={`Archivar ${exercise.nombre ?? 'ejercicio'}`} disabled={archive.isPending} onClick={() => void changeArchive(exercise, false)}><Archive aria-hidden="true" className="size-4" />Archivar</Button>}</div>}
          </div>
            ))}</div>
          </section>
        })}</div>
      </Card>
      {editing && <ExerciseDialog key={editing === 'new' ? 'new' : editing.id} exercise={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => {
        await client.invalidateQueries({ queryKey: queryKeys.exercises.all })
        setEditing(null)
        notify({ type: 'success', message: editing === 'new' ? 'Ejercicio creado correctamente.' : 'Ejercicio actualizado correctamente.' })
      }} />}
    </div>
  )
}

function ExerciseDialog({ exercise, onClose, onSaved }: {
  exercise: Exercise | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { notify } = useToast()
  const [nombre, setNombre] = useState(exercise?.nombre ?? '')
  const initialType: GameType = exercise?.tipo && categoryOf(exercise.tipo) ? exercise.tipo : DEFAULT_TYPE_BY_CATEGORY[exercise?.categoria ?? 'Atención']
  const [categoria, setCategoria] = useState<Category>(categoryOf(initialType)!)
  const [tipo, setTipo] = useState<GameType>(initialType)
  const [level, setLevel] = useState(String(exercise?.nivel_dificultad ?? 1))
  const [instructions, setInstructions] = useState(exercise?.instrucciones ?? '')
  const [paramsForm, setParamsForm] = useState(() => paramsToForm(tipo, exercise?.parametros))
  const [fieldError, setFieldError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError('')
    const parsed = formToParams(tipo, paramsForm)
    if (!parsed.ok) { setFieldError(parsed.error); return }
    const numericLevel = Number(level)
    if (!Number.isInteger(numericLevel) || numericLevel <= 0) { setFieldError('El nivel de dificultad debe ser un entero mayor que 0.'); return }
    setSaving(true)
    try {
      const body = { nombre: nombre.trim(), categoria, tipo, nivel_dificultad: numericLevel, instrucciones: instructions.trim(), parametros: parsed.params }
      const result = exercise?.id
        ? await apiClient.PUT('/ejercicios/{id}', { params: { path: { id: exercise.id } }, body })
        : await apiClient.POST('/ejercicios', { body })
      if (exercise?.id && result.response.status === 409) {
        notify({ type: 'error', message: 'No se puede editar este ejercicio porque está en una ruta activa.' })
        return
      }
      requireResponse(result.data, result.response)
      await onSaved()
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) })
    } finally { setSaving(false) }
  }

  return <Dialog title={exercise ? 'Editar ejercicio' : 'Crear ejercicio'} onClose={onClose}>
    <form className="space-y-3" onSubmit={(event) => void submit(event)} noValidate>
      <label className="block text-sm font-semibold" htmlFor="exercise-name">Nombre<Input id="exercise-name" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="mt-1" /></label>
      <label className="block text-sm font-semibold" htmlFor="exercise-cat">Clasificación<Select id="exercise-cat" value={categoria} onChange={(e) => {
        const next = e.target.value as Category
        setCategoria(next)
        const game = DEFAULT_TYPE_BY_CATEGORY[next]
        setTipo(game)
        setParamsForm(paramsToForm(game, undefined))
      }} className="mt-1">{categories.map((value) => <option key={value}>{value}</option>)}</Select></label>
      <label className="block text-sm font-semibold" htmlFor="exercise-type">Juego<Select id="exercise-type" value={tipo} onChange={(e) => {
        const next = e.target.value as GameType
        setTipo(next)
        setParamsForm(paramsToForm(next, undefined))
      }} className="mt-1">{gamesOf(categoria).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select>
        <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">{GAME_TYPES.find((item) => item.value === tipo)?.hint}</span>
      </label>
      <label className="block text-sm font-semibold" htmlFor="exercise-level">Nivel de dificultad<Input id="exercise-level" type="number" min="1" step="1" value={level} onChange={(e) => setLevel(e.target.value)} required className="mt-1" /></label>
      <label className="block text-sm font-semibold" htmlFor="exercise-instructions">Instrucciones<Textarea id="exercise-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} required className="mt-1" /></label>
      <ParamsEditor type={tipo} form={paramsForm} onChange={setParamsForm} />
      {fieldError && <p role="alert" className="text-sm text-[var(--color-attention-text)]">{fieldError}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{exercise ? 'Guardar cambios' : 'Crear ejercicio'}</Button></div>
    </form>
  </Dialog>
}
