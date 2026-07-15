'use client';

import { useEffect, useState } from 'react';
import type { TodayFlow } from '@/lib/flow';
import { BAND_COPY } from '@/lib/copy';
import { toJstParts } from '@/lib/time';
import type { LuckyColor } from './lucky';

const STORAGE_KEY = 'nagare.visit.v1';

function jstDateKey(now: Date): string {
  const p = toJstParts(now);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function jstDayNumber(now: Date): number {
  const p = toJstParts(now);
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86400000);
}

/** 連続観測日数を localStorage で更新して返す（JST 暦日基準） */
function useStreak(now: Date): number {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    try {
      const todayKey = jstDateKey(now);
      const todayNum = jstDayNumber(now);
      const raw = localStorage.getItem(STORAGE_KEY);
      let next = 1;
      if (raw) {
        const prev = JSON.parse(raw) as { last: string; lastNum: number; streak: number };
        if (prev.last === todayKey) next = prev.streak;
        else if (todayNum - prev.lastNum === 1) next = prev.streak + 1;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ last: todayKey, lastNum: todayNum, streak: next }));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント時に端末保存の連続日数を一度だけ読む意図的なゲート（useProfile と同様）
      setStreak(next);
    } catch {
      /* localStorage 不可の環境では表示しないだけ */
    }
  }, [now]);
  return streak;
}

function greeting(now: Date): string {
  const h = toJstParts(now).hour;
  if (h >= 5 && h < 11) return 'おはようございます';
  if (h >= 11 && h < 17) return 'こんにちは';
  return 'こんばんは';
}

/** いちばん強いシグナルの句（優先度順・LLM不使用の決定的テンプレート） */
function topSignal(today: TodayFlow, meinichi: boolean): string {
  const sj = new Set(today.data.senjitsu.map((s) => s.key));
  const m = today.data.moon;
  if (sj.has('tensha')) return '今日は天赦日';
  if (sj.has('ichiryu')) return '今日は一粒万倍日';
  if (meinichi) return '今日はあなたの「命の日」';
  if (today.data.rokuyo.index === 0) return '今日は大安';
  if (m.phaseIndex === 0) return '今日は新月';
  if (m.phaseIndex === 4) return '今日は満月';
  if (today.data.mercuryRetrograde) return '水星逆行の見直し期';
  const b = today.data.biorhythm;
  if ((b.physical + b.emotional + b.intellectual) / 3 < -0.3) return 'からだは充電モード';
  return `今日は${today.data.rokuyo.name}の日`;
}

function bandText(score: number): string {
  return (BAND_COPY.find((b) => score >= b.min) ?? BAND_COPY[BAND_COPY.length - 1]).text;
}

export function Hitokoto({
  now,
  today,
  meinichi,
  lucky,
  shimmer = false,
}: {
  now: Date;
  today: TodayFlow;
  meinichi: boolean;
  lucky: LuckyColor;
  /** 天赦日の金シマー（1回・呼び出し側で日次ガード済み） */
  shimmer?: boolean;
}) {
  const streak = useStreak(now);
  return (
    <div className={`card hitokoto rise${shimmer ? ' hitokoto-shimmer' : ''}`} style={{ marginTop: 16 }}>
      {meinichi && (
        <span className="meinichi-badge" title="本命宿が巡る、あなただけの吉日">
          命の日
        </span>
      )}
      <p className="hitokoto-text">
        {greeting(now)}。{topSignal(today, meinichi)} — {bandText(today.score)}
      </p>
      <div className="hitokoto-meta">
        <span className="lucky-pill">
          <i className="lucky-dot" aria-hidden />
          今日の色　{lucky.colorName}
          <span className="lucky-gogyo">（{lucky.gogyo}）</span>
        </span>
        {streak >= 2 && <span className="streak-note">連続{streak}日目の観測</span>}
      </div>
    </div>
  );
}
