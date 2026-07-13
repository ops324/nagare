'use client';

import { useState } from 'react';
import type { BirthProfile, Gender } from '@/lib/types';

const GENDERS: Gender[] = ['女', '男', '未回答'];

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
    <>
      <main className="onboard">
        <div className="onboard-inner rise">
          <div className="onboard-mark font-display">流れ</div>
          <p className="onboard-lead">
            天体の動き、暦、生まれの傾向を、ひとつに束ねて。
            <br />
            あなたの「今日の流れ」と「大きな流れ」を読み解きます。
          </p>
          <div className="hair" style={{ margin: '22px 0 26px' }} />

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

            <button type="button" className="disclose" onClick={() => setShowTime((v) => !v)}>
              {showTime ? '−' : '＋'} 出生時刻を入れる（任意・より詳しく）
            </button>
            {showTime && (
              <label className="field">
                <span className="field-label">出生時刻</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                <span className="field-hint">月の位置や命式の精度が上がります。分からなければ空欄で構いません。</span>
              </label>
            )}

            <div className="field">
              <span className="field-label">性別（厄年の判定に使用・任意）</span>
              <div className="seg">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="seg-btn"
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
        </div>
      </main>
    </>
  );
}
