/**
 * Economía de AiKO: monedas por resultados y tienda (potenciador de XP,
 * salvador de racha y accesorios del osito). Reglas puras, sin base de datos.
 */

export type ShopItemType = 'accesorio' | 'potenciador' | 'salvador';

export type ShopItem = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  tipo: ShopItemType;
};

/** Accesorios del osito (`base` = sin accesorio, gratis). */
export const ACCESSORIES = [
  'base',
  'gorra',
  'gafas',
  'audifonos',
  'mono',
  'gorro',
  'bufanda',
  'corona',
] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export const XP_BOOST_ID = 'potenciador_xp';
export const STREAK_SAVER_ID = 'salvador_racha';

/** Ejercicios aprobados con XP doble por cada potenciador. */
export const XP_BOOST_EXERCISES = 3;
/** Salvadores de racha que se pueden tener a la vez. */
export const MAX_STREAK_SAVERS = 3;
/** Monedas extra al completar todos los ejercicios de un día (la isla). */
export const DAY_BONUS_COINS = 10;
/** Monedas extra por un puntaje de [PERFECT_SCORE] o más. */
export const PERFECT_BONUS_COINS = 5;
export const PERFECT_SCORE = 90;

const accessory = (
  id: Accessory,
  nombre: string,
  precio: number,
  descripcion: string,
): ShopItem => ({ id, nombre, descripcion, precio, tipo: 'accesorio' });

export const SHOP: ShopItem[] = [
  {
    id: XP_BOOST_ID,
    nombre: 'Potenciador de XP ×2',
    descripcion: `Tus siguientes ${XP_BOOST_EXERCISES} ejercicios aprobados dan el doble de XP.`,
    precio: 40,
    tipo: 'potenciador',
  },
  {
    id: STREAK_SAVER_ID,
    nombre: 'Salvador de racha',
    descripcion: `Si un día no juegas, tu racha no se rompe. Puedes tener hasta ${MAX_STREAK_SAVERS}.`,
    precio: 60,
    tipo: 'salvador',
  },
  accessory('gorra', 'Gorra', 50, 'Una gorra deportiva para AiKO.'),
  accessory('mono', 'Moño', 60, 'Un moño rojo muy elegante.'),
  accessory('gafas', 'Gafas', 80, 'Gafas redondas de explorador.'),
  accessory('bufanda', 'Bufanda', 90, 'Una bufanda calientita.'),
  accessory(
    'audifonos',
    'Audífonos',
    100,
    'Para escuchar las melodías de colores.',
  ),
  accessory('gorro', 'Gorro de lana', 120, 'Un gorro con pompón.'),
  accessory('corona', 'Corona', 200, 'Para quien practica como la realeza.'),
];

export const shopItem = (id: string) => SHOP.find((item) => item.id === id);

export const isAccessory = (value: string): value is Accessory =>
  (ACCESSORIES as readonly string[]).includes(value);

/** Monedas por un ejercicio aprobado (sin el bono del día). */
export function coinsForScore(score: number): number {
  const base = Math.round(Math.max(0, Math.min(100, score)) / 10);
  return base + (score >= PERFECT_SCORE ? PERFECT_BONUS_COINS : 0);
}

export function shiftDay(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Días sin práctica que cubrirían los salvadores para no romper la racha:
 * los días entre la última práctica (o día protegido) y hoy. Si no alcanzan
 * los salvadores para todo el hueco, no se cubre ninguno.
 */
export function daysToProtect(
  activeDays: Iterable<string>,
  today: string,
  savers: number,
): string[] {
  const days = new Set(activeDays);
  if (savers <= 0 || days.has(today)) return [];
  const previous = [...days].filter((day) => day < today).sort();
  const last = previous.at(-1);
  if (!last) return [];
  const gap: string[] = [];
  for (let day = shiftDay(last, 1); day < today; day = shiftDay(day, 1)) {
    gap.push(day);
    if (gap.length > savers) return [];
  }
  return gap;
}
