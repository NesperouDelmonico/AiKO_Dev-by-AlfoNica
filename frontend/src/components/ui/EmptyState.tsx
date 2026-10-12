import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Inbox aria-hidden="true" className="size-8 text-[var(--color-accent)]" strokeWidth={1.75} />
      <h2 className="mb-0 text-lg">{title}</h2>
      {description && <p className="max-w-md text-sm text-[var(--color-text-muted)]">{description}</p>}
      {action}
    </div>
  )
}
