import { describe, it, expect } from 'vitest';
import { jstNoon, addDays } from '../time';
import { nijuhasshuku } from '../koyomi';

describe('二十八宿（暦注・日替わり／koyominote掲載日と一致）', () => {
  it.each([
    [7, 1, '箕'],
    [7, 2, '斗'],
    [7, 3, '牛'],
    [7, 4, '女'],
    [7, 5, '虚'],
    [7, 6, '危'],
    [7, 7, '室'],
    [7, 8, '壁'],
    [7, 23, '角'],
    [7, 24, '亢'],
    [7, 25, '氐'],
    [7, 31, '牛'],
  ])('2026/%i/%i = %s宿', (m, d, name) => {
    expect(nijuhasshuku(jstNoon(2026, m, d)).name).toBe(name);
  });

  it('28日周期で一巡する', () => {
    const base = jstNoon(2026, 7, 23);
    expect(nijuhasshuku(base).name).toBe(nijuhasshuku(addDays(base, 28)).name);
    expect(nijuhasshuku(base).name).toBe('角');
  });

  it('出典メタを持つ', () => {
    expect(nijuhasshuku(jstNoon(2026, 7, 23)).provenance.method).toContain('二十八宿');
  });
});
