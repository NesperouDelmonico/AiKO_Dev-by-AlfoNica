import { cn } from '../../lib/utils'
import aikoBear from '../../assets/brand/aiko-bear.svg'
import aikoLogoColor from '../../assets/brand/aiko-logo-color.svg'

type LogoProps = {
  className?: string
  compact?: boolean
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <img
      className={cn('aiko-logo', compact && 'aiko-logo--compact', compact ? 'max-h-16 max-w-full' : 'max-h-36 max-w-full', 'h-auto object-contain', className)}
      src={compact ? aikoBear : aikoLogoColor}
      alt="AiKO"
      width={compact ? 68 : 220}
      height={compact ? 82 : 172}
    />
  )
}
