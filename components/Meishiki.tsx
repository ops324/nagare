import type { Meishiki as MeishikiType } from '@/lib/shichu';
import type { Kanshi } from '@/lib/koyomi';

function Pillar({ label, kanshi }: { label: string; kanshi: Kanshi | null }) {
  return (
    <div className="pillar">
      <div className="pillar-label">{label}</div>
      {kanshi ? (
        <>
          <div className="pillar-stem font-display">{kanshi.stemName}</div>
          <div className="pillar-branch font-display">{kanshi.branchName}</div>
          <div className="pillar-yomi">{kanshi.yomi}</div>
        </>
      ) : (
        <>
          <div className="pillar-stem font-display" style={{ color: 'var(--text-faint)' }}>
            —
          </div>
          <div className="pillar-empty">時刻未入力</div>
        </>
      )}
    </div>
  );
}

export function Meishiki({ meishiki }: { meishiki: MeishikiType }) {
  return (
    <div className="card meishiki">
      <div className="meishiki-pillars">
        <Pillar label="年柱" kanshi={meishiki.year} />
        <Pillar label="月柱" kanshi={meishiki.month} />
        <Pillar label="日柱" kanshi={meishiki.day} />
        <Pillar label="時柱" kanshi={meishiki.hour} />
      </div>
      <div className="meishiki-meta">
        <span>
          日主 <b className="font-display">{meishiki.dayMaster}</b>
        </span>
        <span>
          天中殺 <b className="font-display">{meishiki.tenchusatsu.name}</b>
        </span>
      </div>
    </div>
  );
}
