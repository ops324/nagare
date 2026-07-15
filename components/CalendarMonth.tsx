'use client';

import { useMemo, useState } from 'react';
import { jstNoon, toJstParts } from '@/lib/time';
import { rokuyo, senjitsu, solarTermsInYear } from '@/lib/koyomi';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

interface DayCell {
  day: number;
  weekday: number;
  rokuyo: string;
  rokuyoTone: 'good' | 'bad' | 'mixed';
  term: string | null;
  tensha: boolean;
  ichiryu: boolean;
  kanoene: boolean;
  tora: boolean;
  mi: boolean;
  tsuchinotomi: boolean;
}

export function CalendarMonth({ now }: { now: Date }) {
  const today = toJstParts(now);
  const [ym, setYm] = useState({ year: today.year, month: today.month });

  const cells = useMemo<DayCell[]>(() => {
    const { year, month } = ym;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const terms = solarTermsInYear(year).filter((t) => t.jst.month === month);
    const termByDay = new Map(terms.map((t) => [t.jst.day, t.name]));
    const out: DayCell[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const inst = jstNoon(year, month, d);
      const rk = rokuyo(inst);
      const sj = senjitsu(inst).map((s) => s.key);
      out.push({
        day: d,
        weekday: toJstParts(inst).weekday,
        rokuyo: rk.name,
        rokuyoTone: rk.tone,
        term: termByDay.get(d) ?? null,
        tensha: sj.includes('tensha'),
        ichiryu: sj.includes('ichiryu'),
        kanoene: sj.includes('kinoene'),
        tora: sj.includes('tora'),
        mi: sj.includes('mi'),
        tsuchinotomi: sj.includes('tsuchinotomi'),
      });
    }
    return out;
  }, [ym]);

  const lead = cells.length ? cells[0].weekday : 0;
  const isThisMonth = today.year === ym.year && today.month === ym.month;

  const shift = (delta: number) => {
    setYm((p) => {
      const m = p.month + delta;
      if (m < 1) return { year: p.year - 1, month: 12 };
      if (m > 12) return { year: p.year + 1, month: 1 };
      return { year: p.year, month: m };
    });
  };

  return (
    <div className="card calendar">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => shift(-1)} aria-label="前の月">
          ‹
        </button>
        <div className="cal-title font-display">
          {ym.year}年 {ym.month}月
        </div>
        <button className="cal-nav" onClick={() => shift(1)} aria-label="次の月">
          ›
        </button>
      </div>
      <div className="cal-grid">
        {WEEK.map((w, i) => (
          <div key={w} className="cal-w" data-wd={i}>
            {w}
          </div>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {cells.map((c) => (
          <div
            key={c.day}
            className="cal-day"
            data-wd={c.weekday}
            data-today={isThisMonth && c.day === today.day}
          >
            <div className="cal-daynum">{c.day}</div>
            <div className="cal-roku" data-tone={c.rokuyoTone}>
              {c.rokuyo}
            </div>
            {c.term && <div className="cal-term">{c.term}</div>}
            <div className="cal-marks">
              {c.tensha && <span className="mk mk-tensha" title="天赦日">★</span>}
              {c.ichiryu && <span className="mk mk-ichiryu" title="一粒万倍日">●</span>}
              {c.kanoene && <span className="mk mk-kanoene" title="甲子">甲</span>}
              {c.tora && <span className="mk mk-tora" title="寅の日">寅</span>}
              {(c.mi || c.tsuchinotomi) && (
                <span className={c.tsuchinotomi ? 'mk mk-tsuchinotomi' : 'mk mk-mi'} title={c.tsuchinotomi ? '己巳（特に強い巳の日）' : '巳の日'}>
                  巳
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="cal-legend">
        <span><b className="mk-tensha">★</b> 天赦日</span>
        <span><b className="mk-ichiryu">●</b> 一粒万倍日</span>
        <span><b className="mk-kanoene">甲</b> 甲子</span>
        <span><b className="mk-tora">寅</b> 寅の日</span>
        <span><b className="mk-mi">巳</b> 巳の日（<b className="mk-tsuchinotomi">金</b>＝己巳）</span>
      </div>
    </div>
  );
}
