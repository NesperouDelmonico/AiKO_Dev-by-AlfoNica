import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'success' | 'pending' | 'attention' | 'neutral'
}

const variants = {
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]',
  pending: 'bg-[var(--color-pending-bg)] text-[var(--color-pending-text)]',
  attention: 'bg-[var(--color-attention-bg)] text-[var(--color-attention-text)]',
  neutral: 'bg-purple-100 text-brand-heading',
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', variants[variant], className)}
      {...props}
    />
  )
}
