import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

function bogotaGreeting(date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Bogota',
  }).format(date))
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function PageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel = 'Volver',
  greetingName,
  context,
}: {
  title: string
  description?: string
  actions?: ReactNode
  backTo?: string
  backLabel?: string
  greetingName?: string
  context?: string
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-brand-primary no-underline transition-colors duration-150 hover:bg-purple-50"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {backLabel}
          </Link>
        )}
        {greetingName !== undefined && (
          <p className="greeting-enter mb-1 text-lg font-semibold text-brand-primary">
            {bogotaGreeting()}{greetingName ? `, ${greetingName}` : ''}
          </p>
        )}
        <h1 className="mb-1 text-3xl">{title}</h1>
        {description && <p className="mb-0 text-sm text-[var(--color-text-muted)]">{description}</p>}
        {context && <p className="mb-0 mt-2 inline-flex rounded-full bg-[var(--color-highlight-bg)] px-3 py-1 text-sm font-semibold text-[var(--color-highlight-text)]">{context}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
