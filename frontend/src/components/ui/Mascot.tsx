import { useState } from 'react'
import bearSrc from '../../assets/brand/aiko-bear.svg'
import { cn } from '../../lib/utils'

export function Mascot({ src = bearSrc, className }: { src?: string; className?: string }) {
  const [unavailable, setUnavailable] = useState(false)

  if (!src || unavailable) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-grid size-16 shrink-0 place-items-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] text-xs font-semibold tracking-widest text-brand-heading',
          className,
        )}
      >
        AiKO
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={cn('size-16 shrink-0 object-contain', className)}
      onError={() => setUnavailable(true)}
    />
  )
}
