import { ZODIAC, KYUSEI } from '@/lib/constants';
import { SHUKU27 } from '@/lib/sukuyo';
import { RUNKI_CYCLE } from '@/lib/rokusei';
import { ZODIAC_TRAIT, KYUSEI_TRAIT, SHUKU_TRAIT, RUNKI_DESC, SANKU_DESC, CAUTION_COPY } from '@/lib/copy';

interface Item {
  name: string;
  yomi?: string;
  desc: string;
  tone?: 'good' | 'caution' | 'neutral';
}

function JitenSection({ label, note, items }: { label: string; note?: string; items: Item[] }) {
  return (
    <>
      <div className="section-head">
        <span className="eyebrow">{label}</span>
        <hr className="hair" />
      </div>
      {note && <p className="soft-note" style={{ marginTop: 0, marginBottom: 10 }}>{note}</p>}
      <div className="card jiten-list">
        {items.map((it) => (
          <div key={it.name} className="jiten-row" data-tone={it.tone ?? ''}>
            <div className="jiten-name font-display">
              {it.name}
              {it.yomi && <span className="jiten-yomi">{it.yomi}</span>}
            </div>
            <div className="jiten-desc">{it.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}

const SANKU_ORDER = ['命', '栄親', '業胎', '友衰', '安壊', '成危'];
const SANKU_TONE: Record<string, 'good' | 'caution'> = {
  命: 'good', 栄親: 'good', 業胎: 'caution', 友衰: 'caution', 安壊: 'caution', 成危: 'caution',
};

export function Jiten() {
  return (
    <section aria-label="占術事典">
      <p className="soft-note">各占術の意味の一覧です。あなたの結果（生まれ・大きな流れ）とあわせてご覧ください。</p>

      <JitenSection
        label="星座（太陽星座・12）"
        items={ZODIAC.map((z) => ({ name: `${z.symbol} ${z.name}`, yomi: `${z.yomi}・${z.element}`, desc: ZODIAC_TRAIT[z.name] }))}
      />
      <JitenSection
        label="九星（本命星・9）"
        items={KYUSEI.map((k) => ({ name: k.name, yomi: k.yomi, desc: KYUSEI_TRAIT[k.name] }))}
      />
      <JitenSection
        label="宿曜・本命宿（27宿）"
        note="※ 流派差が出やすい部分です。"
        items={SHUKU27.map((s) => ({ name: s.full, yomi: `${s.yomi}しゅく`, desc: SHUKU_TRAIT[s.name] }))}
      />
      <JitenSection
        label="相性・三九の秘法（6）"
        items={SANKU_ORDER.map((k) => ({ name: k, desc: SANKU_DESC[k], tone: SANKU_TONE[k] }))}
      />
      <JitenSection
        label="六星占術・運気（12）"
        items={RUNKI_CYCLE.map((n) => ({
          name: n,
          desc: RUNKI_DESC[n],
          tone: ['陰影', '停止', '減退'].includes(n) ? 'caution' : undefined,
        }))}
      />
      <JitenSection
        label="注意期間の見かた"
        items={Object.values(CAUTION_COPY).map((c) => ({ name: c.title, desc: c.note, tone: 'caution' as const }))}
      />

      <p className="soft-note" style={{ marginTop: 18 }}>
        解説は監修ドラフト（v1）です。今後、内容を更新していきます。娯楽・参考としてお楽しみください。
      </p>
    </section>
  );
}
