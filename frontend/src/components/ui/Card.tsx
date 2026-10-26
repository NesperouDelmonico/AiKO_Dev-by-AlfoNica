import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn('rounded-brand-card border border-[var(--color-card-border)] bg-brand-surface p-6 shadow-brand-card', className)}
      {...props}
    />
  )
}
