import type { HouiResult, Dir8 } from '@/lib/houi';
import { KYUSEI } from '@/lib/constants';

const KANSU = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
// 南を上にした 3×3 配置（中央は中宮）
const LAYOUT: (Dir8 | 'center')[] = ['南東', '南', '南西', '東', 'center', '西', '北東', '北', '北西'];

export function KyuseiBan({ houi }: { houi: HouiResult }) {
  const kyouLabel: Partial<Record<Dir8, string>> = {};
  if (houi.gosatsu) kyouLabel[houi.gosatsu] = '五黄殺';
  if (houi.ankensatsu) kyouLabel[houi.ankensatsu] = '暗剣殺';
  kyouLabel[houi.saiha] = kyouLabel[houi.saiha] ? kyouLabel[houi.saiha] : '歳破';
  if (houi.honmeisatsu) kyouLabel[houi.honmeisatsu] = '本命殺';
  if (houi.honmeitekisatsu && !kyouLabel[houi.honmeitekisatsu]) kyouLabel[houi.honmeitekisatsu] = '本命的殺';

  const kichiDirs = new Set(houi.kichi.map((c) => c.direction));

  return (
    <div className="card kyuseiban">
      <div className="kyuseiban-grid">
        {LAYOUT.map((pos) => {
          if (pos === 'center') {
            return (
              <div key="center" className="ban-cell ban-center">
                <div className="ban-dir">中宮</div>
                <div className="ban-num font-display">{KANSU[houi.chuguu]}</div>
                <div className="ban-star">{KYUSEI[houi.chuguu - 1].name.slice(2)}</div>
              </div>
            );
          }
          const cell = houi.cells.find((c) => c.direction === pos)!;
          const kichi = kichiDirs.has(pos);
          const kyou = kyouLabel[pos];
          const state = kichi ? 'kichi' : kyou ? 'kyou' : 'neutral';
          return (
            <div key={pos} className="ban-cell" data-state={state}>
              <div className="ban-dir">{pos}</div>
              <div className="ban-num font-display">{KANSU[cell.star]}</div>
              {kichi && <div className="ban-tag ban-tag-kichi">吉方</div>}
              {kyou && <div className="ban-tag ban-tag-kyou">{kyou}</div>}
            </div>
          );
        })}
      </div>
      <div className="kyuseiban-note">
        {houi.happouFusagari
          ? 'あなたは今年、本命星が中宮に入る「八方塞がり」。大きな移動や新規は控えめに。'
          : houi.kichi.length > 0
            ? `今年の吉方位は ${houi.kichi.map((c) => c.direction).join('・')}。`
            : '今年は年盤上の吉方位がありません。'}
      </div>
    </div>
  );
}
