'use client';

import { useState } from 'react';
import { honmeishuku } from '@/lib/sukuyo';
import { sanku } from '@/lib/sukuyo-sanku';
import { birthToInstant } from '@/lib/profile';

/** 三九の秘法による相性（相手の生年月日 → 本命宿 → 関係） */
export function Aisho({ myHonmei }: { myHonmei: string }) {
  const [date, setDate] = useState('');
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);

  const result = valid
    ? (() => {
        const other = honmeishuku(birthToInstant({ date }));
        return { other, rel: sanku(myHonmei, other.name) };
      })()
    : null;

  return (
    <div className="card aisho">
      <label className="field" style={{ marginBottom: result ? 14 : 0 }}>
        <span className="field-label">相手の生年月日</span>
        <input
          type="date"
          value={date}
          min="1900-01-01"
          max="2100-12-31"
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      {result ? (
        <div className="aisho-result rise" data-tone={['命', '栄', '親'].includes(result.rel.category) ? 'good' : ['安', '壊'].includes(result.rel.category) ? 'caution' : 'neutral'}>
          <div className="aisho-row">
            <span>相手の本命宿</span>
            <b className="font-display">{result.other.full}</b>
          </div>
          <div className="aisho-rel font-display">{result.rel.label}</div>
          <p className="flowcard-desc" style={{ marginTop: 6 }}>
            {result.rel.note}
          </p>
        </div>
      ) : (
        <p className="soft-note" style={{ marginTop: 8 }}>
          気になる相手の生年月日を入れると、あなたの本命宿との三九の関係が出ます。
        </p>
      )}
    </div>
  );
}
