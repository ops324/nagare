import { describe, it, expect } from 'vitest';
import { sanku } from '../sukuyo-sanku';
import { SHUKU27 } from '../sukuyo';

describe('宿曜・三九の秘法（公開実例＝本命宿「昴」と一致）', () => {
  it.each([
    ['畢', '栄', '近'],
    ['女', '栄', '中'],
    ['軫', '栄', '遠'],
    ['胃', '親', '近'],
    ['張', '親', '中'],
    ['箕', '親', '遠'],
  ])('昴→%s は %s（%s距離）', (other, category, distance) => {
    const r = sanku('昴', other);
    expect(r.category).toBe(category);
    expect(r.distance).toBe(distance);
    expect(r.pair).toBe('栄親');
    expect(r.label).toBe(`${distance}距離の栄親`);
  });

  it('昴→昴 は命、昴→翼(位置9) は業、昴→斗(位置18) は胎', () => {
    expect(sanku('昴', '昴').category).toBe('命');
    expect(sanku('昴', '翼').category).toBe('業');
    expect(sanku('昴', '斗').category).toBe('胎');
  });

  it('どの相手宿でも有効なカテゴリ・距離を返す（27宿すべて）', () => {
    const cats = ['命', '業', '胎', '栄', '衰', '安', '危', '成', '壊', '友', '親'];
    for (const s of SHUKU27) {
      const r = sanku('昴', s.name);
      expect(cats).toContain(r.category);
      if (!['命', '業', '胎'].includes(r.category)) {
        expect(['近', '中', '遠']).toContain(r.distance);
      }
    }
  });

  it('出典メタ（標準宿曜経）を持つ', () => {
    expect(sanku('昴', '畢').provenance.source).toContain('宿曜経');
  });
});
