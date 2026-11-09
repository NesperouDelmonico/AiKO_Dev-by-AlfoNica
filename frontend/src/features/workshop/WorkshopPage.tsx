import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, Search, Store, Undo2, UserRound } from 'lucide-react'
import { apiClient, getErrorMessage, imageUrl, requireResponse } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import type { components } from '../../api/schema'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toastContext'
import { GAME_TYPES, gameTypeLabel, type Category, type GameType } from '../exercises/exerciseTypes'
import { parameterSummary } from './parameterSummary'

type WorkshopExercise = components['schemas']['EjercicioTaller']
const categories: Category[] = ['Atención', 'Memoria', 'Velocidad']
const PAGE_SIZE = 12

/**
 * Taller: ejercicios que otros especialistas publicaron. El especialista los
 * importa como copia a su catálogo; el administrador puede retirarlos
 * (moderación).
 */
export function WorkshopPage({ moderation = false }: { moderation?: boolean }) {
  const client = useQueryClient()
  const { notify } = useToast()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [type, setType] = useState<GameType | ''>('')
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState<WorkshopExercise | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => { setQ(search.trim()); setPage(1) }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const filters = { ...(q ? { q } : {}), ...(category ? { categoria: category } : {}), ...(type ? { tipo: type } : {}), page, limit: PAGE_SIZE }
  const query = useQuery({
    queryKey: queryKeys.workshop.list(filters),
    queryFn: async () => {
      const result = await apiClient.GET('/taller', { params: { query: filters } })
      return requireResponse(result.data, result.response)
    },
    placeholderData: (previous) => previous,
  })

  const importer = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiClient.POST('/taller/{id}/importar', { params: { path: { id } } })
      return requireResponse(result.data, result.response)
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.workshop.all }),
      client.invalidateQueries({ queryKey: queryKeys.exercises.all }),
    ]),
  })
  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiClient.PATCH('/ejercicios/{id}/retirar', { params: { path: { id } } })
      return requireResponse(result.data, result.response)
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.workshop.all }),
      client.invalidateQueries({ queryKey: queryKeys.exercises.all }),
    ]),
  })

  async function importExercise(exercise: WorkshopExercise) {
    try {
      await importer.mutateAsync(exercise.id!)
      setPreview(null)
      notify({ type: 'success', message: `"${exercise.nombre}" se agregó a tu catálogo. Puedes editar tu copia sin afectar el original.` })
    } catch (error) { notify({ type: 'error', message: getErrorMessage(error) }) }
  }
  async function withdrawExercise(exercise: WorkshopExercise) {
    try {
      await withdraw.mutateAsync(exercise.id!)
      setPreview(null)
      notify({ type: 'success', message: `"${exercise.nombre}" se retiró del taller. Las copias ya importadas no cambian.` })
    } catch (error) { notify({ type: 'error', message: getErrorMessage(error) }) }
  }

  const items = query.data?.data ?? []
  const total = query.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="rise-stagger space-y-6">
      <PageHeader
        title="Taller"
        description={moderation
          ? 'Ejercicios que los especialistas comparten. Retira los que no sean adecuados; las copias ya importadas no cambian.'
          : 'Ejercicios que otros especialistas comparten. Impórtalos a tu catálogo como una copia que puedes adaptar.'}
      />
      <Card>
        <div className="mb-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <label htmlFor="workshop-search" className="text-sm font-semibold">Buscar
            <span className="relative mt-1 block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input id="workshop-search" className="pl-9" placeholder="Nombre o instrucciones" value={search} onChange={(e) => setSearch(e.target.value)} />
            </span>
          </label>
          <label htmlFor="workshop-type" className="text-sm font-semibold">Tipo de juego
            <Select id="workshop-type" className="mt-1" value={type} onChange={(e) => { setType(e.target.value as GameType | ''); setPage(1) }}>
              <option value="">Todos</option>
              {GAME_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </label>
          <label htmlFor="workshop-category" className="text-sm font-semibold">Categoría
            <Select id="workshop-category" className="mt-1" value={category} onChange={(e) => { setCategory(e.target.value as Category | ''); setPage(1) }}>
              <option value="">Todas</option>
              {categories.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </label>
        </div>

        {query.isPending && <div aria-busy="true" aria-label="Cargando el taller" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton-shimmer h-40 animate-pulse rounded-xl bg-purple-50" />)}</div>}
        {query.isError && <ErrorState title="No pudimos cargar el taller. Inténtalo de nuevo." message={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Intentar de nuevo</Button>} />}
        {query.isSuccess && items.length === 0 && (q || category || type
          ? <EmptyState title="No hay ejercicios con esos filtros." description="Prueba con otra búsqueda." />
          : <EmptyState title="El taller aún está vacío." description={moderation ? 'Cuando un especialista publique un ejercicio aparecerá aquí.' : 'Publica uno de tus ejercicios desde la página Ejercicios para compartirlo.'} />)}

        <ul className="list-stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Ejercicios del taller">
          {items.map((exercise) => (
            <li key={exercise.id} className="flex flex-col rounded-xl border border-[var(--color-border)] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{gameTypeLabel(exercise.tipo)}</Badge>
                {exercise.es_propio && <Badge variant="success">Tuyo</Badge>}
                {exercise.ya_importado && <Badge variant="pending">Ya lo tienes</Badge>}
              </div>
              <h2 className="mb-1 text-base">{exercise.nombre}</h2>
              <p className="mb-1 text-sm text-[var(--color-text-muted)]">{exercise.categoria} · Nivel {exercise.nivel_dificultad}</p>
              <p className="mb-3 flex items-center gap-1 text-sm text-[var(--color-text-muted)]"><UserRound aria-hidden="true" className="size-4" />{exercise.autor ?? 'Especialista'} · {exercise.veces_importado === 1 ? 'importado 1 vez' : `importado ${exercise.veces_importado ?? 0} veces`}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPreview(exercise)} aria-label={`Ver ${exercise.nombre}`}><Eye aria-hidden="true" className="size-4" />Vista previa</Button>
                <WorkshopAction exercise={exercise} moderation={moderation} busy={importer.isPending || withdraw.isPending} onImport={importExercise} onWithdraw={withdrawExercise} />
              </div>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <nav aria-label="Páginas del taller" className="mt-5 flex items-center justify-center gap-3 text-sm">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <span>Página {page} de {pages}</span>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </nav>
        )}
      </Card>

      {preview && <Dialog title={preview.nombre ?? 'Ejercicio'} description={`${gameTypeLabel(preview.tipo)} · ${preview.categoria} · Nivel ${preview.nivel_dificultad} · de ${preview.autor ?? 'un especialista'}`} onClose={() => setPreview(null)}>
        <Preview exercise={preview} />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setPreview(null)}>Cerrar</Button>
          <WorkshopAction exercise={preview} moderation={moderation} busy={importer.isPending || withdraw.isPending} onImport={importExercise} onWithdraw={withdrawExercise} />
        </div>
      </Dialog>}
    </div>
  )
}

function WorkshopAction({ exercise, moderation, busy, onImport, onWithdraw }: {
  exercise: WorkshopExercise
  moderation: boolean
  busy: boolean
  onImport: (exercise: WorkshopExercise) => void
  onWithdraw: (exercise: WorkshopExercise) => void
}) {
  if (moderation || exercise.es_propio) {
    return <Button size="sm" variant="secondary" disabled={busy} onClick={() => onWithdraw(exercise)} aria-label={`Retirar ${exercise.nombre} del taller`}><Undo2 aria-hidden="true" className="size-4" />Retirar del taller</Button>
  }
  if (exercise.ya_importado) {
    return <Button size="sm" disabled title="Ya está en tu catálogo (búscalo también en Archivados)">Importado</Button>
  }
  return <Button size="sm" disabled={busy} onClick={() => onImport(exercise)} aria-label={`Importar ${exercise.nombre}`}><Download aria-hidden="true" className="size-4" />Importar</Button>
}

function Preview({ exercise }: { exercise: WorkshopExercise }) {
  const summary = parameterSummary(exercise)
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 text-sm font-semibold">Instrucciones para el paciente</h3>
        <p className="mb-0 whitespace-pre-line text-sm">{exercise.instrucciones}</p>
      </section>
      <section>
        <h3 className="mb-1 text-sm font-semibold">Configuración</h3>
        <ul className="mb-0 list-disc space-y-1 pl-5 text-sm">{summary.lines.map((line, i) => <li key={i}>{line}</li>)}</ul>
      </section>
      {summary.images.length > 0 && <section>
        <h3 className="mb-2 text-sm font-semibold">Imágenes</h3>
        <div className="flex flex-wrap gap-2">{summary.images.map((id, i) => <img key={`${id}-${i}`} src={imageUrl(id)} alt={`Imagen ${i + 1} del ejercicio`} className="h-20 w-20 rounded-lg border border-[var(--color-border)] object-cover" loading="lazy" />)}</div>
      </section>}
      <p className="mb-0 flex items-center gap-2 rounded-xl bg-[var(--color-surface-soft)] p-3 text-sm"><Store aria-hidden="true" className="size-4 shrink-0" />Al importarlo se crea una copia en tu catálogo; los cambios que haga el autor no afectan tu copia ni tus rutas.</p>
    </div>
  )
}
