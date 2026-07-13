/**
 * 出典・方式メタ（method / source / version）
 *
 * 占術ごとに「どの方式・どの一次資料・どの版で計算しているか」を明示し、
 * 将来の流派差し替えを容易にする。UI で出典を表示する用途にも使う。
 */
export interface Provenance {
  method: string;
  source: string;
  version: string;
}

export const PROVENANCE = {
  /** 六星占術：運命星＝日柱の空亡、運気は 6sei.net 公式の2026年表をアンカーに12年周期展開 */
  rokusei: {
    method: '空亡→星人／年支オフセットで運気を算出',
    source: '6sei.net（細木数子・細木かおり 公式）',
    version: '2026-anchor-v1',
  },
  /** 宿曜・三九の秘法：標準宿曜経準拠（公開実例で検証）。解説文は今後、小峰有美子氏体系で差替予定 */
  sukuyoSanku: {
    method: '27宿の位置差でカテゴリ、近中遠は最小円距離',
    source: '標準宿曜経（小峰有美子体系で文言差替予定）',
    version: 'std-v1',
  },
  /** 二十八宿：暦注の日替わり（基準 2026-07-23=角宿） */
  nijuhasshuku: {
    method: '日替わり二十八宿（28日周期）',
    source: '暦注の二十八宿',
    version: 'v1',
  },
} as const satisfies Record<string, Provenance>;
