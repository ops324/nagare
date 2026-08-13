import { describe, it, expect } from 'vitest';
import { jstNoon } from '../time';
import { honmeishuku, shukuOf, SHUKU27 } from '../sukuyo';

describe('宿曜：本命宿（旧暦＋朔日宿方式）', () => {
  it('27宿がそろう', () => {
    expect(SHUKU27).toHaveLength(27);
  });
  it('1986-10-19（旧暦9月16日）は畢宿', () => {
    expect(honmeishuku(jstNoon(1986, 10, 19)).name).toBe('畢');
  });
  it('旧暦の朔日は朔日宿：2026-02-17（旧暦1月1日）は室宿', () => {
    expect(shukuOf(jstNoon(2026, 2, 17)).name).toBe('室');
  });
});
