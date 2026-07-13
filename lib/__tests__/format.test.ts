import { describe, it, expect } from 'vitest';
import { jstToInstant } from '../time';
import { jstYearMonth } from '../format';

describe('jstYearMonth', () => {
  it('インスタント → 「YYYY年M月」（ゼロ埋めなし）', () => {
    expect(jstYearMonth(jstToInstant(2026, 2, 4, 12, 0))).toBe('2026年2月');
    expect(jstYearMonth(jstToInstant(2027, 12, 31, 23, 59))).toBe('2027年12月');
  });
});
