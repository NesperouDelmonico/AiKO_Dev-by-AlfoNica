import { Award, Coins, Flame, Route as RouteIcon, Sparkles, Star } from 'lucide-react'
import type { components } from '../../api/schema'
import { AikoBear } from '../../components/aiko/AikoBear'
import { ACCESSORY_LABELS, type Accessory } from '../../components/aiko/accessories'
import { Card } from '../../components/ui/Card'
import { formatDate } from '../../lib/date'
import { formatPercent, roundPercent } from '../../lib/percent'

type Patient = components['schemas']['Paciente']

function textOrDash(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

/**
 * Resumen del paciente con su osito (con el accesorio que eligió en la app)
 * y sus datos clave. Los datos completos quedan en un desplegable.
 */
export function PatientSummary({
  patient,
  routePercent,
  streak,
  badges,
  activeAlerts,
}: {
  patient: Patient
  routePercent: number | null
  streak: number | null
  badges: number | null
  activeAlerts: number | null
}) {
  const accessory = (patient.accesorio ?? 'base') as Accessory
  const stats = [
    { icon: Star, label: 'Nivel', value: textOrDash(patient.nivel_actual), tone: 'bg-purple-100 text-brand-primary' },
    { icon: Sparkles, label: 'XP total', value: textOrDash(patient.xp_total), tone: 'bg-sky-100 text-sky-700' },
    { icon: Coins, label: 'Monedas', value: textOrDash(patient.monedas ?? 0), tone: 'bg-amber-100 text-amber-700' },
    { icon: Flame, label: 'Racha', value: streak == null ? '—' : `${streak} ${streak === 1 ? 'día' : 'días'}`, tone: 'bg-orange-100 text-orange-700' },
    { icon: Award, label: 'Insignias', value: textOrDash(badges), tone: 'bg-pink-100 text-pink-700' },
  ]
  const details = [
    ['Nombre', patient.nombre],
    ['Edad', patient.edad == null ? null : `${patient.edad} años`],
    ['Correo', patient.correo],
    ['Cédula', patient.cedula],
    ['Fecha de nacimiento', patient.fecha_nacimiento ? formatDate(patient.fecha_nacimiento) : null],
    ['Fecha de asignación', patient.fecha_asignacion ? formatDate(patient.fecha_asignacion) : null],
    ['Umbral de bajo rendimiento', patient.umbral_bajo_rendimiento == null ? null : formatPercent(patient.umbral_bajo_rendimiento)],
    ['Días de inactividad para alerta', patient.umbral_dias_inactividad],
  ] as const

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-6 bg-gradient-to-br from-purple-100/80 via-white to-amber-50/70 p-6 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center gap-2">
          <div className="pop-in grid size-36 place-items-center rounded-full bg-white shadow-brand-card">
            <AikoBear accessory={accessory} float className="size-28" title={`Osito de ${patient.nombre}`} />
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-heading">
            {accessory === 'base' ? 'Sin accesorio' : ACCESSORY_LABELS[accessory]}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="mb-1 text-2xl">Resumen</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            {patient.edad == null ? 'Edad sin registrar' : `${patient.edad} años`}
            {patient.fecha_asignacion ? ` · contigo desde ${formatDate(patient.fecha_asignacion)}` : ''}
            {activeAlerts ? ` · ${activeAlerts} ${activeAlerts === 1 ? 'alerta activa' : 'alertas activas'}` : ''}
          </p>
          <ul className="list-stagger grid grid-cols-2 gap-3 pl-0 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map(({ icon: Icon, label, value, tone }) => (
              <li key={label} className="lift list-none rounded-2xl bg-white/90 p-3 shadow-sm">
                <span className={`mb-2 inline-grid size-8 place-items-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="size-4" /></span>
                <p className="mb-0 text-xs text-[var(--color-text-muted)]">{label}</p>
                <p className="mb-0 text-lg font-bold text-brand-heading">{value}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-brand-heading"><RouteIcon aria-hidden="true" className="size-4" />Avance de la ruta</span>
              <strong className="text-brand-heading">{routePercent == null ? 'Sin ruta activa' : formatPercent(routePercent)}</strong>
            </div>
            <div role="progressbar" aria-label={`Avance de la ruta: ${formatPercent(routePercent)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundPercent(routePercent)} className="h-3 overflow-hidden rounded-full bg-white">
              <div className="bar-fill h-full rounded-full [background-image:var(--gradient-primary-accessible)]" style={{ width: `${roundPercent(routePercent)}%` }} />
            </div>
          </div>
        </div>
      </div>
      <details className="group border-t border-[var(--color-border)] px-6 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-brand-primary">Ver todos los datos</summary>
        <dl className="unfold mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-[var(--color-text-muted)]">{label}</dt>
              <dd className="mb-0 mt-1 break-words text-sm font-semibold text-brand-heading">{textOrDash(value)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </Card>
  )
}
