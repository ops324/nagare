import { describe, it, expect } from 'vitest';
import { houi } from '../houi';

describe('九星年盤・凶方位（決定論的な五黄殺・歳破）', () => {
  it('2026年（中宮一白）: 五黄殺=南、暗剣殺=北、歳破=北', () => {
    const r = houi(3, 2026);
    expect(r.chuguu).toBe(1);
    expect(r.gosatsu).toBe('南');
    expect(r.ankensatsu).toBe('北');
    expect(r.saiha).toBe('北'); // 午年→子(北)
  });

  it('2025年（中宮二黒）: 五黄殺=北東、歳破=北西', () => {
    const r = houi(3, 2025);
    expect(r.chuguu).toBe(2);
    expect(r.gosatsu).toBe('北東');
    expect(r.saiha).toBe('北西'); // 巳年→亥(北西)
  });

  it('8方位すべてに九星が回座し、中宮星は方位に現れない', () => {
    const r = houi(3, 2026);
    expect(r.cells).toHaveLength(8);
    expect(r.cells.map((c) => c.star)).not.toContain(r.chuguu);
    // 全方位の星＋中宮星で1〜9が揃う
    expect(new Set([...r.cells.map((c) => c.star), r.chuguu]).size).toBe(9);
  });
});

describe('吉方位・八方塞がり', () => {
  it('本命星＝中宮星の年は八方塞がり（吉方なし・本命殺なし）', () => {
    const r = houi(1, 2026); // 一白の人・2026(中宮一白)
    expect(r.happouFusagari).toBe(true);
    expect(r.kichi).toHaveLength(0);
    expect(r.honmeisatsu).toBeNull();
  });

  it('八方塞がりでない人は本命殺が方位にあり、吉方は凶方を含まない', () => {
    const r = houi(3, 2026);
    expect(r.happouFusagari).toBe(false);
    expect(r.honmeisatsu).not.toBeNull();
    for (const cell of r.kichi) {
      expect(r.kyou).not.toContain(cell.direction);
      expect(cell.star).not.toBe(5);
    }
  });
});
