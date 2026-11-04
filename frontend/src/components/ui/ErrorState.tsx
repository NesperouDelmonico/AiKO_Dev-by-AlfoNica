import type { ReactNode } from 'react'
import { Mascot } from './Mascot'

export function ErrorState({ title = 'No pudimos completar esta acción. Inténtalo de nuevo.', message, action }: { title?: string; message?: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <Mascot className="size-16" />
      <h2 className="mb-0 text-lg">{title}</h2>
      {message && <p className="max-w-md text-sm text-[var(--color-text-muted)]">{message}</p>}
      {action}
    </div>
  )
}
