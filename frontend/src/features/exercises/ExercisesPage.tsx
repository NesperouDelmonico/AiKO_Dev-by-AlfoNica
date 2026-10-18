import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { apiClient, getErrorMessage, requireResponse } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import type { components } from '../../api/schema'
import { ParamsEditor } from './ParamsEditor'
import {
  DEFAULT_TYPE_BY_CATEGORY, formToParams, GAME_TYPES, gameTypeLabel, paramsToForm, type GameType,
} from './exerciseTypes'

type Exercise = components['schemas']['Ejercicio']
type Category = components['schemas']['CategoriaEjercicio']
type ExerciseState = components['schemas']['EstadoEjercicio']
const categories: Category[] = ['Atención', 'Memoria', 'Velocidad']

export function ExercisesPage() {
  const client = useQueryClient()
  const [category, setCategory] = useState<Category | ''>('')
  const [state, setState] = useState<ExerciseState | ''>('')
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)
  const [failure, setFailure] = useState('')
  const filters = useMemo(() => ({ ...(category ? { categoria: category } : {}), ...(state ? { estado: state } : {}) }), [category, state])
  const query = useQuery({
    queryKey: queryKeys.exercises.list(filters),
    queryFn: async () => {
      const result = await apiClient.GET('/ejercicios', { params: { query: filters } })
      return requireResponse(result.data, result.response)
    },
  })
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
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-sm font-semibold text-brand-primary">AiKO · Especialista</p><h1 className="mb-0 text-3xl">Ejercicios</h1></div><Button onClick={() => { setFailure(''); setEditing('new') }}><Plus aria-hidden="true" className="size-4" />Crear ejercicio</Button></header>
      <Card>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <label htmlFor="exercise-category" className="text-sm font-semibold">Categoría
            <Select id="exercise-category" className="mt-1" value={category} onChange={(e) => setCategory(e.target.value as Category | '')}><option value="">Todas</option>{categories.map((value) => <option key={value}>{value}</option>)}</Select>
          </label>
          <label htmlFor="exercise-state" className="text-sm font-semibold">Estado
            <Select id="exercise-state" className="mt-1" value={state} onChange={(e) => setState(e.target.value as ExerciseState | '')}><option value="">Todos</option><option>Activo</option><option>Desactivado</option></Select>
          </label>
        </div>
        {query.isPending && <div aria-busy="true" aria-label="Cargando ejercicios" className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-purple-50" />)}</div>}
        {query.isError && <ErrorState title="No se pudieron cargar los ejercicios" message={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button>} />}
        {query.isSuccess && items.length === 0 && <EmptyState title="Sin ejercicios" description="Prueba con otros filtros o crea un ejercicio." />}
        <div className="space-y-3">{items.map((exercise, i) => (
          <div key={exercise.id ?? i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4">
            <div><h2 className="mb-1 text-base">{exercise.nombre || '—'}</h2><p className="mb-2 text-sm text-[var(--color-text-muted)]">{gameTypeLabel(exercise.tipo)} · {exercise.categoria || '—'} · Nivel {exercise.nivel_dificultad ?? '—'}</p><Badge variant={exercise.estado === 'Activo' ? 'success' : 'attention'}>{exercise.estado || 'Estado no disponible'}</Badge></div>
            <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setFailure(''); setEditing(exercise) }}>Editar</Button>{exercise.id && <Button size="sm" variant="secondary" disabled={toggle.isPending} onClick={async () => { try { await toggle.mutateAsync({ id: exercise.id!, estado: exercise.estado === 'Activo' ? 'Desactivado' : 'Activo' }) } catch (error) { setFailure(getErrorMessage(error)) } }}>{exercise.estado === 'Activo' ? 'Desactivar' : 'Activar'}</Button>}</div>
          </div>
        ))}</div>
        {failure && <p role="alert" className="mt-4 rounded-xl bg-[var(--color-attention-bg)] p-3 text-sm text-[var(--color-attention-text)]">{failure}</p>}
      </Card>
      {editing && <ExerciseDialog key={editing === 'new' ? 'new' : editing.id} exercise={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { await client.invalidateQueries({ queryKey: queryKeys.exercises.all }); setEditing(null) }} />}
    </div>
  )
}

function ExerciseDialog({ exercise, onClose, onSaved }: {
  exercise: Exercise | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [nombre, setNombre] = useState(exercise?.nombre ?? '')
  const [categoria, setCategoria] = useState<Category>(exercise?.categoria ?? 'Velocidad')
  const [tipo, setTipo] = useState<GameType>(exercise?.tipo ?? (exercise?.categoria ? DEFAULT_TYPE_BY_CATEGORY[exercise.categoria] : 'reaccion'))
  const [level, setLevel] = useState(String(exercise?.nivel_dificultad ?? 1))
  const [instructions, setInstructions] = useState(exercise?.instrucciones ?? '')
  const [paramsForm, setParamsForm] = useState(() => paramsToForm(tipo, exercise?.parametros))
  const [fieldError, setFieldError] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError('')
    setDialogError('')
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
        setDialogError('No se puede editar este ejercicio porque está en una ruta activa.')
        return
      }
      requireResponse(result.data, result.response)
      await onSaved()
    } catch (error) {
      setDialogError(getErrorMessage(error))
    } finally { setSaving(false) }
  }

  return <Dialog title={exercise ? 'Editar ejercicio' : 'Crear ejercicio'} onClose={onClose}>
    <form className="space-y-3" onSubmit={(event) => void submit(event)} noValidate>
      <label className="block text-sm font-semibold" htmlFor="exercise-name">Nombre<Input id="exercise-name" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="mt-1" /></label>
      <label className="block text-sm font-semibold" htmlFor="exercise-type">Tipo de juego<Select id="exercise-type" value={tipo} onChange={(e) => {
        const next = e.target.value as GameType
        setTipo(next)
        setParamsForm(paramsToForm(next, undefined))
        if (!exercise) setCategoria(GAME_TYPES.find((item) => item.value === next)?.category ?? categoria)
      }} className="mt-1">{GAME_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select>
        <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">{GAME_TYPES.find((item) => item.value === tipo)?.hint}</span>
      </label>
      <label className="block text-sm font-semibold" htmlFor="exercise-cat">Categoría cognitiva<Select id="exercise-cat" value={categoria} onChange={(e) => setCategoria(e.target.value as Category)} className="mt-1">{categories.map((value) => <option key={value}>{value}</option>)}</Select></label>
      <label className="block text-sm font-semibold" htmlFor="exercise-level">Nivel de dificultad<Input id="exercise-level" type="number" min="1" step="1" value={level} onChange={(e) => setLevel(e.target.value)} required className="mt-1" /></label>
      <label className="block text-sm font-semibold" htmlFor="exercise-instructions">Instrucciones<Textarea id="exercise-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} required className="mt-1" /></label>
      <ParamsEditor type={tipo} form={paramsForm} onChange={setParamsForm} />
      {fieldError && <p role="alert" className="text-sm text-[var(--color-attention-text)]">{fieldError}</p>}
      {dialogError && <p role="alert" className="rounded-xl bg-[var(--color-attention-bg)] p-3 text-sm text-[var(--color-attention-text)]">{dialogError}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{exercise ? 'Guardar cambios' : 'Crear ejercicio'}</Button></div>
    </form>
  </Dialog>
}
