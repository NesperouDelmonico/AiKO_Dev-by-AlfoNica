import { cn } from '../../lib/utils'

type LogoProps = {
  className?: string
  compact?: boolean
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <img
      className={cn('aiko-logo', compact && 'aiko-logo--compact', className)}
      src="/assets/brand/logo.svg"
      alt="AiKO"
      width="132"
      height="42"
    />
  )
}
