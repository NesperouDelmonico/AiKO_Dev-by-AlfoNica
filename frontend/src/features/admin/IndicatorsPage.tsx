import { lazy, Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../api/queryKeys'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { formatDate } from '../../lib/date'
import { getIndicators, getTrends } from './api'

const TrendChart = lazy(() => import('./TrendChart').then((module) => ({ default: module.TrendChart })))

export function IndicatorsPage() {
  const [period, setPeriod] = useState<'semanal' | 'mensual'>('semanal')
  const indicators = useQuery({ queryKey: queryKeys.adminIndicators, queryFn: getIndicators })
  const trends = useQuery({ queryKey: queryKeys.adminTrends(period), queryFn: () => getTrends(period) })
  const chart = (trends.data ?? []).map((item) => ({
    fecha: item.fecha ? formatDate(item.fecha, { day: '2-digit', month: 'short' }) : '—',
    fechaCompleta: item.fecha ?? '',
    sesiones: item.sesiones ?? 0,
  }))
  return (
    <div className="space-y-6">
      <header><p className="mb-1 text-sm font-semibold text-brand-primary">AiKO · Administración</p><h1 className="mb-0 text-3xl">Indicadores</h1></header>
      {indicators.isPending && <div aria-busy="true" aria-label="Cargando indicadores" className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>}
      {indicators.isError && <ErrorState title="No se pudieron cargar los indicadores" message={indicators.error.message} action={<Button variant="secondary" onClick={() => void indicators.refetch()}>Reintentar</Button>} />}
      {indicators.data && <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Usuarios registrados" value={indicators.data.total_usuarios} />
        <Metric title="Pacientes" value={indicators.data.total_pacientes} />
        <Metric title="Ejercicios registrados en las últimas 24 horas" value={indicators.data.sesiones_activas} />
      </div>}
      <Card>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="mb-1 text-xl">Tendencias de uso</h2><p className="mb-0 text-sm text-[var(--color-text-muted)]">Sesiones agregadas por período.</p></div>
          <div role="group" aria-label="Período de tendencias" className="flex gap-2"><Button variant={period === 'semanal' ? 'primary' : 'secondary'} onClick={() => setPeriod('semanal')}>Semanal</Button><Button variant={period === 'mensual' ? 'primary' : 'secondary'} onClick={() => setPeriod('mensual')}>Mensual</Button></div>
        </div>
        {trends.isPending && <div aria-busy="true" aria-label="Cargando tendencias" className="h-64 animate-pulse rounded-xl bg-purple-50" />}
        {trends.isError && <ErrorState title="No se pudieron cargar las tendencias" message={trends.error.message} action={<Button variant="secondary" onClick={() => void trends.refetch()}>Reintentar</Button>} />}
        {trends.isSuccess && chart.length === 0 && <EmptyState title="Sin datos de tendencias" />}
        {chart.length > 0 && <>
          <Suspense fallback={<div aria-busy="true" aria-label="Cargando gráfica" className="h-72 animate-pulse rounded-xl bg-purple-50" />}>
            <TrendChart data={chart} />
          </Suspense>
          <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Ver tabla accesible de tendencias</summary>
            <table className="mt-3 w-full text-left text-sm"><caption className="sr-only">Tendencias de uso, período {period}</caption><thead><tr><th className="p-2">Fecha</th><th className="p-2">Sesiones</th></tr></thead><tbody>{chart.map((row) => <tr key={row.fechaCompleta}><td className="p-2">{row.fechaCompleta || '—'}</td><td className="p-2">{row.sesiones}</td></tr>)}</tbody></table>
          </details>
        </>}
      </Card>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: number | undefined }) {
  return <Card><p className="mb-2 text-sm text-[var(--color-text-muted)]">{title}</p><p className="mb-0 text-3xl font-semibold text-brand-heading">{value ?? '—'}</p></Card>
}
