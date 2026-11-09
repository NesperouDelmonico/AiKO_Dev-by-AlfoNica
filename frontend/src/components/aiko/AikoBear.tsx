import { cn } from '../../lib/utils'
import { ACCESSORY_LABELS, type Accessory } from './accessories'

const INK = '#2B2340'
const BODY = '#8B5CFF'

/** Capas del accesorio (mismas coordenadas que el osito del logo y la app). */
function AccessoryLayer({ accessory }: { accessory: Accessory }) {
  switch (accessory) {
    case 'gorra':
      return (
        <g>
          <path d="M-21 -15Q-22 -38 0 -38Q22 -38 21 -15Z" fill="#E5484D" />
          <path d="M9 -16Q32 -19 41 -12Q31 -8 9 -11Z" fill="#C33238" />
          <path d="M-21 -15Q0 -20 21 -15" fill="none" stroke="#C33238" strokeWidth="2" />
          <circle cx="0" cy="-38" r="2.4" fill="#C33238" />
        </g>
      )
    case 'gafas':
      return (
        <g fill="rgb(255 255 255 / 30%)" stroke={INK} strokeWidth="2.2">
          <circle cx="-12" cy="-6" r="7.5" />
          <circle cx="12" cy="-6" r="7.5" />
          <path d="M-4.5 -6.5Q0 -9 4.5 -6.5M-19.5 -7L-28 -10M19.5 -7L28 -10" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'audifonos':
      return (
        <g>
          <path d="M-29 -3Q-31 -43 0 -43Q31 -43 29 -3" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <rect x="-36" y="-11" width="11" height="19" rx="5" fill="#3E7BFA" />
          <rect x="25" y="-11" width="11" height="19" rx="5" fill="#3E7BFA" />
          <rect x="-33.5" y="-7" width="4" height="11" rx="2" fill="#8FB8FF" />
          <rect x="29.5" y="-7" width="4" height="11" rx="2" fill="#8FB8FF" />
        </g>
      )
    case 'mono':
      return (
        <g transform="translate(-15 -31) rotate(-18)">
          <path d="M0 0L-13 -8L-13 8Z" fill="#E93D82" />
          <path d="M0 0L13 -8L13 8Z" fill="#E93D82" />
          <circle cx="0" cy="0" r="4" fill="#C2185B" />
        </g>
      )
    case 'gorro':
      return (
        <g>
          <path d="M-27 -12Q-28 -42 0 -42Q28 -42 27 -12Z" fill="#12A594" />
          <path d="M-18 -36Q0 -44 18 -36M-24 -26Q0 -34 24 -26" fill="none" stroke="#0D7F72" strokeWidth="2" />
          <rect x="-29" y="-17" width="58" height="9" rx="4.5" fill="#0D7F72" />
          <circle cx="0" cy="-44" r="6" fill="#FFF7E6" />
        </g>
      )
    case 'bufanda':
      return (
        <g>
          <path d="M-23 20Q0 33 23 20L25 28Q0 41 -25 28Z" fill="#E5484D" />
          <path d="M8 29L19 29L21 47L10 47Z" fill="#C33238" />
          <path d="M11 47v3M15 47v3M19 47v3" stroke="#C33238" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M-14 26.5Q0 32 14 26.5" fill="none" stroke="#FFD23F" strokeWidth="2" />
        </g>
      )
    case 'corona':
      return (
        <g>
          <path d="M-17 -25L-18 -41L-9 -32L0 -45L9 -32L18 -41L17 -25Z" fill="#FFD23F" stroke="#E0A800" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="0" cy="-31" r="2.6" fill="#E5484D" />
          <circle cx="-10" cy="-28.5" r="1.8" fill="#3E7BFA" />
          <circle cx="10" cy="-28.5" r="1.8" fill="#30A46C" />
        </g>
      )
    default:
      return null
  }
}

/**
 * Osito de AiKO con el accesorio que eligió el paciente en la app.
 * `float` lo hace flotar suavemente (se desactiva con "reducir movimiento").
 */
export function AikoBear({
  accessory = 'base',
  className,
  float = false,
  title,
}: {
  accessory?: Accessory | string | null | undefined
  className?: string
  float?: boolean
  title?: string
}) {
  const chosen = (accessory && accessory in ACCESSORY_LABELS ? accessory : 'base') as Accessory
  const label = title ?? (chosen === 'base' ? 'AiKO' : `AiKO con ${ACCESSORY_LABELS[chosen].toLowerCase()}`)
  return (
    <svg
      viewBox="-44 -50 88 100"
      role="img"
      aria-label={label}
      className={cn('shrink-0', float && 'bear-float', className)}
    >
      <title>{label}</title>
      <circle cx="-21" cy="-23" r="10" fill={BODY} />
      <circle cx="21" cy="-23" r="10" fill={BODY} />
      <circle cx="-21" cy="-23" r="5" fill="#B9A6F0" />
      <circle cx="21" cy="-23" r="5" fill="#B9A6F0" />
      <path d="M-20 22L-26 42L-2 29Z" fill={BODY} />
      <circle cx="0" cy="0" r="30" fill={BODY} />
      <ellipse cx="0" cy="9" rx="11" ry="8" fill="#E9E1FF" />
      <ellipse cx="0" cy="5" rx="3.5" ry="2.5" fill={INK} />
      <ellipse className="bear-eye" cx="-12" cy="-6" rx="3" ry="3" fill={INK} />
      <ellipse className="bear-eye" cx="12" cy="-6" rx="3" ry="3" fill={INK} />
      <path d="M-5 11Q0 15 5 11" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="-22" cy="5" r="3.5" fill="#FFD23F" />
      <circle cx="22" cy="5" r="3.5" fill="#FFD23F" />
      <AccessoryLayer accessory={chosen} />
    </svg>
  )
}
