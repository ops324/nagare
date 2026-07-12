/**
 * 九星気学：年盤と吉方位
 *
 * 年盤（洛書配置）から各方位の九星を求め、凶方（五黄殺・暗剣殺・歳破・本命殺・本命的殺）を除き、
 * 本命星と相生・比和の方位を吉方とする。※年盤ベース（月盤・日盤の重なりは別途）。
 * 五黄殺・歳破は決定論的で、既知の値（2026＝五黄殺 南／歳破 北）と一致を確認。
 */
import { honmeiNumberForYear } from './kyusei';
import { yearKanshi } from './koyomi';
import { KYUSEI } from './constants';

// 8方位（中央を除く）
export type Dir8 = '北' | '北東' | '東' | '南東' | '南' | '南西' | '西' | '北西';
const OPPOSITE: Record<Dir8, Dir8> = {
  北: '南', 南: '北', 東: '西', 西: '東',
  北東: '南西', 南西: '北東', 南東: '北西', 北西: '南東',
};

// 定位盤（五黄中央）：base星 → 方位
const BASE_DIR: Record<number, Dir8> = {
  1: '北', 2: '南西', 3: '東', 4: '南東', 6: '北西', 7: '西', 8: '北東', 9: '南',
};
const DIR_LIST: Dir8[] = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];

// 十二支 index → 8方位
const BRANCH_DIR: Dir8[] = ['北', '北東', '北東', '東', '南東', '南東', '南', '南西', '南西', '西', '北西', '北西'];

// 五行 index: 木=0,火=1,土=2,金=3,水=4
const STAR_ELEMENT: Record<number, number> = { 1: 4, 2: 2, 3: 0, 4: 0, 5: 2, 6: 3, 7: 3, 8: 2, 9: 1 };

/** hElem から見て sElem が相生(隣接)か比和(同一)なら true（相剋でない） */
function compatible(hElem: number, sElem: number): boolean {
  return sElem === hElem || sElem === (hElem + 1) % 5 || sElem === (hElem + 4) % 5;
}

function mod9to1(n: number): number {
  return (((n - 1) % 9) + 9) % 9 + 1;
}

/** 年盤で base 定位宮に回座する星（中宮星 c のとき） */
function placedStar(base: number, c: number): number {
  return mod9to1(base - 1 + (c - 5) + 1);
}

export interface HouiCell {
  direction: Dir8;
  star: number; // その方位に回座する九星
  starName: string;
}

export interface HouiResult {
  year: number;
  chuguu: number; // 中宮星
  cells: HouiCell[]; // 8方位
  gosatsu: Dir8 | null; // 五黄殺
  ankensatsu: Dir8 | null; // 暗剣殺
  saiha: Dir8; // 歳破
  honmeisatsu: Dir8 | null; // 本命殺（中宮＝八方塞がりなら null）
  honmeitekisatsu: Dir8 | null; // 本命的殺
  happouFusagari: boolean;
  kyou: Dir8[]; // 凶方位（重複なし）
  kichi: HouiCell[]; // 吉方位
}

/** 本命星番号 h の人にとって、立春基準の年 year の年盤・吉方位 */
export function houi(honmeiNumber: number, year: number): HouiResult {
  const c = honmeiNumberForYear(year); // 中宮星
  const cells: HouiCell[] = DIR_LIST.map((dir) => {
    const base = Number(Object.keys(BASE_DIR).find((b) => BASE_DIR[Number(b)] === dir));
    const star = placedStar(base, c);
    return { direction: dir, star, starName: KYUSEI[star - 1].name };
  });

  const dirOfStar = (s: number): Dir8 | null => cells.find((cell) => cell.star === s)?.direction ?? null;

  const gosatsu = c === 5 ? null : dirOfStar(5);
  const ankensatsu = gosatsu ? OPPOSITE[gosatsu] : null;
  const saiha = OPPOSITE[BRANCH_DIR[yearKanshi(year).branch]];
  const honmeisatsu = honmeiNumber === c ? null : dirOfStar(honmeiNumber);
  const honmeitekisatsu = honmeisatsu ? OPPOSITE[honmeisatsu] : null;
  const happouFusagari = honmeiNumber === c;

  const kyouSet = new Set<Dir8>();
  for (const d of [gosatsu, ankensatsu, saiha, honmeisatsu, honmeitekisatsu]) if (d) kyouSet.add(d);

  const hElem = STAR_ELEMENT[honmeiNumber];
  const kichi = happouFusagari
    ? []
    : cells.filter(
        (cell) =>
          !kyouSet.has(cell.direction) &&
          cell.star !== 5 &&
          cell.star !== honmeiNumber &&
          compatible(hElem, STAR_ELEMENT[cell.star]),
      );

  return {
    year,
    chuguu: c,
    cells,
    gosatsu,
    ankensatsu,
    saiha,
    honmeisatsu,
    honmeitekisatsu,
    happouFusagari,
    kyou: [...kyouSet],
    kichi,
  };
}
