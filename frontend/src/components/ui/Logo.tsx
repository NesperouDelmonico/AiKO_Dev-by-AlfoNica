import { cn } from '../../lib/utils'
import aikoIcon from '../../assets/brand/aiko-icon.svg'

type LogoProps = {
  className?: string
  compact?: boolean
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <img
      className={cn('aiko-logo', compact && 'aiko-logo--compact', 'max-h-12 max-w-full object-contain', className)}
      src={aikoIcon}
      alt="AiKO"
      width="220"
      height="172"
    />
  )
}
