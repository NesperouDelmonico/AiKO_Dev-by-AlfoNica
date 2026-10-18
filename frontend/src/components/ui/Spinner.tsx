import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      aria-label="Cargando"
      role="status"
      className={cn('size-5 animate-spin text-brand-primary', className)}
      strokeWidth={1.75}
    />
  )
}
