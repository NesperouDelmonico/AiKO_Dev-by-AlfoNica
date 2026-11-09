import type { components } from '../../api/schema'

export type Accessory = components['schemas']['Accesorio']

export const ACCESSORY_LABELS: Record<Accessory, string> = {
  base: 'Sin accesorio',
  gorra: 'Gorra',
  gafas: 'Gafas',
  audifonos: 'Audífonos',
  mono: 'Moño',
  gorro: 'Gorro de lana',
  bufanda: 'Bufanda',
  corona: 'Corona',
}

