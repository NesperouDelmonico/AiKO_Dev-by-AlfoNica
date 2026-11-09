import { useMemo, useState } from 'react'
import { Check, Clock, Coins, Lock, Sparkles, Target, Zap } from 'lucide-react'
import { imageUrl } from '../../api/client'
import { AikoBear } from '../../components/aiko/AikoBear'
import { Badge } from '../../components/ui/Badge'
import { formatDate } from '../../lib/date'
import { formatPercent, roundPercent } from '../../lib/percent'
import { cn } from '../../lib/utils'
import { gameTypeLabel } from '../exercises/exerciseTypes'
import type { Exercise, HistoryItem, TherapyRoute } from './api'
import { GOAL_ISLAND, routeDays, type RouteDay } from './islands'

const STATE_LABEL: Record<RouteDay['state'], string> = {
  done: 'Completada',
  current: 'En curso',
  waiting: 'Se habilita pronto',
  locked: 'Por llegar',
}

const SPACING = 168
const ISLAND = 128

/**
 * Ruta activa como mapa de islas (una por día, como en la app). Al tocar una
 * isla se despliega el informe de cómo le fue al paciente en cada ejercicio.
 */
export function RouteIslands({
  route,
  exercises,
  results,
  accessory,
}: {
  route: TherapyRoute
  exercises: Exercise[]
  results: HistoryItem[]
  accessory?: string | null | undefined
}) {
  const days = useMemo(
    () => routeDays(route, (id) => exercises.find((exercise) => exercise.id === id)?.tipo),
    [route, exercises],
  )
  const current = days.find((day) => day.state === 'current' || day.state === 'waiting') ?? days.at(-1)
  const [selected, setSelected] = useState<number | null>(current?.day ?? null)
  const chosen = days.find((day) => day.day === selected)
  const finished = days.length > 0 && days.every((day) => day.state === 'done')

  const width = (days.length + 1) * SPACING
  const points = [...days.map((_, index) => index), days.length].map((index) => ({
    x: index * SPACING + SPACING / 2,
    y: index % 2 === 0 ? 118 : 58,
  }))
  const path = points.reduce((d, point, index) => {
    if (index === 0) return `M${point.x} ${point.y + 40}`
    const prev = points[index - 1]!
    const mid = (prev.x + point.x) / 2
    return `${d} C${mid} ${prev.y + 40}, ${mid} ${point.y + 40}, ${point.x} ${point.y + 40}`
  }, '')

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-sky-100/80 via-purple-50 to-amber-50/60 pb-2" role="list" aria-label="Islas de la ruta, una por día">
        <div className="relative" style={{ width, height: 260 }}>
          <svg className="pointer-events-none absolute inset-0" width={width} height={260} aria-hidden="true">
            <path d={path} fill="none" stroke="white" strokeWidth={6} strokeLinecap="round" strokeDasharray="2 16" />
          </svg>
          {days.map((day, index) => {
            const point = points[index]!
            const active = day.day === selected
            const isCurrent = day.state === 'current' || day.state === 'waiting'
            return (
              <div key={day.day} role="listitem" className="absolute" style={{ left: point.x - ISLAND / 2, top: point.y - 46 }}>
                <button
                  type="button"
                  onClick={() => setSelected(day.day)}
                  aria-pressed={active}
                  aria-label={`Día ${day.day}, ${day.theme.name}: ${STATE_LABEL[day.state]}, ${day.completed} de ${day.total} ejercicios. Ver informe`}
                  className={cn(
                    'island-bob group relative flex w-32 flex-col items-center rounded-3xl p-1 transition-transform duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-3 focus-visible:outline-brand-primary',
                    active && 'scale-105',
                  )}
                  style={{ ['--i' as string]: index }}
                >
                  {isCurrent && (
                    <AikoBear accessory={accessory} float className="absolute -top-12 left-1/2 z-10 size-14 -translate-x-1/2 drop-shadow-md" />
                  )}
                  <span className={cn('relative rounded-full', active && 'ring-4 ring-brand-primary/50', isCurrent && 'island-glow')}>
                    <img
                      src={day.theme.image}
                      alt=""
                      className={cn('h-24 w-32 object-contain drop-shadow-lg', day.state === 'locked' && 'opacity-60 grayscale')}
                    />
                  </span>
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm',
                      day.state === 'done' && 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]',
                      isCurrent && 'bg-brand-primary text-white',
                      day.state === 'locked' && 'bg-white text-[var(--color-text-muted)]',
                    )}
                  >
                    {day.state === 'done' ? <Check aria-hidden="true" className="size-3.5" /> : day.state === 'locked' ? <Lock aria-hidden="true" className="size-3" /> : null}
                    Día {day.day} · {day.completed}/{day.total}
                  </span>
                </button>
              </div>
            )
          })}
          <div className="absolute" style={{ left: points[days.length]!.x - 52, top: points[days.length]!.y - 30 }} aria-hidden="true">
            <img src={GOAL_ISLAND.image} alt="" className={cn('island-bob h-20 w-28 object-contain drop-shadow-lg', !finished && 'opacity-70 saturate-50')} style={{ ['--i' as string]: days.length }} />
            <span className="mx-auto mt-1 block w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Meta</span>
          </div>
        </div>
      </div>

      {chosen && <IslandReport key={chosen.day} day={chosen} exercises={exercises} results={results} />}
    </div>
  )
}

function IslandReport({ day, exercises, results }: { day: RouteDay; exercises: Exercise[]; results: HistoryItem[] }) {
  const dayResults = results.filter((result) => day.steps.some((step) => step.id === result.ruta_ejercicio_id))
  const approved = dayResults.filter((result) => (result.xp_ganado ?? 0) > 0)
  const average = approved.length ? approved.reduce((sum, r) => sum + (r.puntaje ?? 0), 0) / approved.length : null
  const coins = dayResults.reduce((sum, r) => sum + (r.monedas_ganadas ?? 0), 0)
  const xp = dayResults.reduce((sum, r) => sum + (r.xp_ganado ?? 0), 0)

  return (
    <section aria-label={`Informe del día ${day.day}`} className="unfold rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={day.theme.image} alt="" className="h-14 w-16 object-contain" />
          <div>
            <h3 className="mb-0 text-lg">Día {day.day} · {day.theme.name}</h3>
            <p className="mb-0 text-sm text-[var(--color-text-muted)]">{STATE_LABEL[day.state]} · {day.completed} de {day.total} ejercicios</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stat icon={Target} label="Promedio" value={average === null ? '—' : formatPercent(average)} />
          <Stat icon={Sparkles} label="XP" value={String(xp)} />
          <Stat icon={Coins} label="Monedas" value={String(coins)} />
        </div>
      </div>

      <ol className="list-stagger grid gap-3 pl-0 md:grid-cols-2">
        {day.steps.map((step, index) => {
          const exercise = step.ejercicio ?? exercises.find((item) => item.id === step.ejercicio_id)
          const attempts = dayResults.filter((result) => result.ruta_ejercicio_id === step.id)
          const best = attempts.reduce<number | null>((max, r) => Math.max(max ?? 0, r.puntaje ?? 0), null)
          const last = attempts.at(-1)
          const drawings = attempts.flatMap((r) => r.dibujos ?? [])
          const completed = step.estado === 'Completado'
          return (
            <li key={step.id ?? index} className="lift list-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="mb-0 font-semibold text-brand-heading">{index + 1}. {exercise?.nombre ?? 'Ejercicio'}</p>
                  <p className="mb-0 text-xs text-[var(--color-text-muted)]">{gameTypeLabel(exercise?.tipo)}{exercise?.categoria ? ` · ${exercise.categoria}` : ''}</p>
                </div>
                <Badge variant={completed ? 'success' : attempts.length ? 'attention' : 'pending'}>
                  {completed ? 'Aprobado' : attempts.length ? 'Sin aprobar' : 'Sin intentos'}
                </Badge>
              </div>
              {attempts.length === 0 ? (
                <p className="mb-0 text-sm text-[var(--color-text-muted)]">Aún no lo ha jugado.</p>
              ) : (
                <>
                  <div className="mb-2 h-2 overflow-hidden rounded-full bg-purple-100" role="progressbar" aria-label={`Mejor puntaje: ${formatPercent(best)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundPercent(best)}>
                    <div className="bar-fill h-full rounded-full bg-brand-primary" style={{ width: `${roundPercent(best)}%` }} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <Fact label="Mejor" value={formatPercent(best)} />
                    <Fact label="Último" value={formatPercent(last?.puntaje)} />
                    <Fact label="Intentos" value={String(attempts.length)} />
                    <Fact label="Aciertos" value={String(last?.aciertos ?? '—')} />
                    <Fact label="Tiempo" value={last?.tiempo_reaccion_ms == null ? '—' : `${(last.tiempo_reaccion_ms / 1000).toFixed(1)} s`} />
                    <Fact label="Monedas" value={String(attempts.reduce((sum, r) => sum + (r.monedas_ganadas ?? 0), 0))} />
                  </dl>
                  <p className="mb-0 mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <Clock aria-hidden="true" className="size-3.5" />
                    {last?.fecha ? formatDate(last.fecha, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    {attempts.some((r) => r.xp_doble) && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800"><Zap aria-hidden="true" className="size-3" />XP ×2</span>}
                  </p>
                  {drawings.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {drawings.map((drawing, i) => (
                        <a key={drawing} href={imageUrl(drawing)} target="_blank" rel="noreferrer" aria-label={`Ver dibujo ${i + 1} de ${exercise?.nombre ?? 'ejercicio'}`} className="pop-in" style={{ ['--i' as string]: i }}>
                          <img src={imageUrl(drawing)} alt="" loading="lazy" className="size-16 rounded-xl border border-[var(--color-border)] bg-white object-contain" />
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2 text-sm">
      <Icon aria-hidden="true" className="size-4 text-brand-primary" />
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <strong className="text-brand-heading">{value}</strong>
    </span>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mb-0 mt-0.5 font-semibold text-brand-heading">{value}</dd>
    </div>
  )
}
