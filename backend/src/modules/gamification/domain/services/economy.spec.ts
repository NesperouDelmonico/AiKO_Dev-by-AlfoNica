import {
  coinsForScore,
  daysToProtect,
  isAccessory,
  shopItem,
  SHOP,
} from './economy';

describe('economía', () => {
  it('da monedas según el puntaje, con bono por 90 o más', () => {
    expect(coinsForScore(60)).toBe(6);
    expect(coinsForScore(84)).toBe(8);
    expect(coinsForScore(90)).toBe(14);
    expect(coinsForScore(100)).toBe(15);
    expect(coinsForScore(-5)).toBe(0);
  });

  it('el catálogo tiene precios positivos e ids únicos', () => {
    const ids = SHOP.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SHOP.every((item) => item.precio > 0)).toBe(true);
    expect(shopItem('corona')?.tipo).toBe('accesorio');
    expect(shopItem('base')).toBeUndefined();
    expect(isAccessory('gafas')).toBe(true);
    expect(isAccessory('capa')).toBe(false);
  });

  it('calcula los días que cubrirían los salvadores', () => {
    const played = ['2026-10-24', '2026-10-25'];
    expect(daysToProtect(played, '2026-10-28', 2)).toEqual([
      '2026-10-26',
      '2026-10-27',
    ]);
    expect(daysToProtect(played, '2026-10-28', 1)).toEqual([]);
    expect(daysToProtect(played, '2026-10-26', 3)).toEqual([]);
    expect(daysToProtect([...played, '2026-10-28'], '2026-10-28', 3)).toEqual(
      [],
    );
    expect(daysToProtect([], '2026-10-28', 3)).toEqual([]);
  });
});
