import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export function ErrorState({ title = 'No pudimos completar la solicitud', message, action }: { title?: string; message?: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <CircleAlert aria-hidden="true" className="size-8 text-[var(--color-attention-text)]" strokeWidth={1.75} />
      <h2 className="mb-0 text-lg">{title}</h2>
      {message && <p className="max-w-md text-sm text-[var(--color-text-muted)]">{message}</p>}
      {action}
    </div>
  )
}
