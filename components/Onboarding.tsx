'use client';

import { useState } from 'react';
import type { BirthProfile, Gender } from '@/lib/types';

const GENDERS: Gender[] = ['女', '男', '未回答'];

/**
 * 入口体験の最終幕に埋め込むフォーム。
 * ワードマーク・リード文・外枠は幕（EntryExperience）側が持つので、ここはフォームだけを出す。
 */
export function Onboarding({ onSubmit }: { onSubmit: (p: BirthProfile) => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [gender, setGender] = useState<Gender>('未回答');
  const [showTime, setShowTime] = useState(false);

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const p: BirthProfile = { date, gender };
    if (showTime && /^\d{2}:\d{2}$/.test(time)) p.time = time;
    onSubmit(p);
  };

  return (
    <form onSubmit={submit} className="onboard-form">
      <label className="field">
        <span className="field-label">生年月日</span>
        <input
          type="date"
          value={date}
          min="1900-01-01"
          max="2100-12-31"
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      {/* 「任意・より詳しく」では何が増えるのか分からない。実測に基づいて
          具体的に言う（600件で計測：時柱は時刻が無いと 100% 出ない／
          星座 3.8%・月柱 2.5%・立運 2.2%・年柱と本命星 0.3% が境界日に動く）。 */}
      {/* ＋／− は罫で引く（.disclose-mark）。グリフだと明朝／ゴシックの
          どちらで組んでも符として揃わず、開閉が「別の字への差し替え」に
          なってしまう。罫なら縦画が消えるだけの**ひとつの所作**になる。 */}
      <button
        type="button"
        className="disclose"
        aria-expanded={showTime}
        aria-controls="birth-time-field"
        onClick={() => setShowTime((v) => !v)}
      >
        <span className="disclose-mark" aria-hidden="true" />
        <span className="disclose-label">出生時刻を入れる（四柱が4本そろいます）</span>
      </button>
      {showTime && (
        <label className="field" id="birth-time-field">
          <span className="field-label">出生時刻</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          {/* 旧文言は「月の位置や命式の精度が上がります」だったが、本命宿は
              旧暦＋朔日宿方式＝暦日ベースで、時刻を入れても 0% 変わらない。
              実際に効くところだけを書く。 */}
          <span className="field-hint">
            時刻を入れると<b>時柱</b>が出て、四柱がそろいます。
            節入りや立春の境目に生まれた方は、星座・月柱・立運も変わることがあります。
            分からなければ空欄のままで構いません。
          </span>
        </label>
      )}

      <div className="field">
        <span className="field-label">性別（節目の年の判定に使用・任意）</span>
        {/* 活性は塗りではなく「席を移る線」（design.md「形」）。
            線の位置は CSS が --seg-i / --seg-n だけで決めるので、
            選択肢が増えてもここの style 以外は触らなくていい。 */}
        <div
          className="seg"
          role="radiogroup"
          aria-label="性別"
          style={
            {
              '--seg-i': GENDERS.indexOf(gender),
              '--seg-n': GENDERS.length,
            } as React.CSSProperties
          }
        >
          {GENDERS.map((g) => (
            <button
              key={g}
              type="button"
              className="seg-btn"
              role="radio"
              aria-checked={gender === g}
              data-active={gender === g}
              onClick={() => setGender(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="cta" disabled={!valid}>
        流れを読む
      </button>
      <p className="onboard-note">
        ※ 入力は端末内にのみ保存され、外部には送信されません。娯楽・参考としてお楽しみください。
      </p>
    </form>
  );
}
