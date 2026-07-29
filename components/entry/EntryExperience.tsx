'use client';

import { useEffect, useRef, useState } from 'react';
import type { BirthProfile } from '@/lib/types';
import { solarTermAround, rokuyo, dayKanshi } from '@/lib/koyomi';
import { moonState } from '@/lib/astro';
import { jstYmd } from '@/lib/format';
import { SEKKI_COLOR_LIST, sekkiColorOf } from '../sekki';
import { luckyColorOf } from '../lucky';
import { SkyField } from '../SkyField';
import { FlowLine } from '../FlowLine';
import { Onboarding } from '../Onboarding';

/**
 * 入口体験 — 未登録の訪問者が最初に見る画面。
 *
 * 「星霜」を増幅したもので、新しい意匠は発明していない：
 *   ①空   実時刻の空の上にワードマーク。**今日の節気・六曜・月相を実値で**出す
 *   ②流れ 流れ線がページ全高を降り、各幕の見出しが川の蛇行に紐づく
 *   ③彩   スクロールに応じて data-sekki を24色巡回させる（最も独自性の高い資産）
 *   ④読む 5タブが何を読むのか
 *   ⑤始め 既存の Onboarding を同じ空の上で
 *
 * `compact` は `/` の未登録分岐用。幕を絞り、節気の巡回はしない
 * （ダッシュボードの data-sekki と競合させないため）。
 */

interface Today {
  term: string;
  rokuyo: string;
  kanshi: string;
  moonAngle: number;
  ymd: string;
}

/** 今日の実値。SSR では出さない（ビルド時の日付で固まってしまうため） */
function useToday(): Today | null {
  const [today, setToday] = useState<Today | null>(null);
  useEffect(() => {
    const now = new Date();
    const k = dayKanshi(now);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 描画時に日付を読むとビルド時刻で固まりハイドレーションも壊れる。マウント後に一度だけ実時刻を読む意図的なゲート
    setToday({
      term: solarTermAround(now).current?.name ?? '',
      rokuyo: rokuyo(now).name,
      kanshi: `${k.stemName}${k.branchName}`,
      moonAngle: moonState(now).phaseAngle,
      ymd: jstYmd(now),
    });
  }, []);
  return today;
}

/** 「彩」の幕にいる間だけ、スクロール位置で html[data-sekki] を24色巡回させる */
function useSekkiScroll(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const root = document.documentElement;
    const restore = root.getAttribute('data-sekki');
    let raf = 0;

    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // 幕が画面を通過する割合（0..1）を24分割して節気を割り当てる
      const span = r.height + window.innerHeight;
      const prog = Math.min(Math.max((window.innerHeight - r.top) / span, 0), 0.9999);
      const i = Math.floor(prog * SEKKI_COLOR_LIST.length);
      root.setAttribute('data-sekki', SEKKI_COLOR_LIST[i].key);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (restore) root.setAttribute('data-sekki', restore);
    };
  }, [ref, enabled]);
}

/** 画面に入ったら現れる幕。reduced-motion では最初から出したまま。 */
function Act({
  children,
  className = '',
  as: Tag = 'section',
  label,
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'div';
  label?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced-motion では観測せず最初から出したままにする意図的なゲート
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -18% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement & HTMLDivElement>}
      className={`entry-act ${className}`}
      data-seen={seen ? '' : undefined}
      aria-label={label}
    >
      {children}
    </Tag>
  );
}

export function EntryExperience({
  compact = false,
  onSubmit,
}: {
  compact?: boolean;
  onSubmit: (p: BirthProfile) => void;
}) {
  const today = useToday();
  const sekkiRef = useRef<HTMLElement>(null);
  useSekkiScroll(sekkiRef, !compact);
  // 慣性スクロールのライブラリ（Lenis 等）は入れない。
  // この入口は流れ線の描画・星図の視差・節気の24色巡回がすべて
  // window の scroll イベント駆動で、スクロールを乗っ取る実装とは両立しない
  // （実測：Lenis 有効時は scrollY が動いても scroll イベントが一度も発火しなかった）。

  const sekki = sekkiColorOf(today?.term);
  const lucky = today ? luckyColorOf(new Date()) : null;

  return (
    <>
      <SkyField moonPhaseAngle={today?.moonAngle} />
      <main className="entry" data-compact={compact ? '' : undefined}>
        <FlowLine amp={0.62} seed={9} />

        {/* ── 一幕：空 ── */}
        <header className="entry-hero">
          <h1 className="entry-mark font-display">流れ</h1>
          <p className="entry-lead">
            天体の動き、暦、生まれの傾向を、ひとつに束ねて。
            <br />
            あなたの「今日の流れ」と「大きな流れ」を読み解きます。
          </p>

          {/* 今日の実値。入力する前から、空も暦ももう本物になっている。 */}
          <dl className="entry-now" aria-label="今日の空">
            <div>
              <dt>節気</dt>
              <dd>{today ? `${today.term}・${sekki.colorName}` : '—'}</dd>
            </div>
            <div>
              <dt>六曜</dt>
              <dd>{today?.rokuyo ?? '—'}</dd>
            </div>
            <div>
              <dt>干支</dt>
              <dd>{today?.kanshi ?? '—'}</dd>
            </div>
            <div>
              <dt>今日の色</dt>
              <dd>{lucky?.colorName ?? '—'}</dd>
            </div>
          </dl>

          {/* 月は SkyField（背景層）が実相で描く。ここでは描かない — 空に月は一つ。 */}

          <p className="entry-scroll" aria-hidden>
            下へ
          </p>
        </header>

        {/* ── 二幕：流れ ── */}
        <Act className="entry-copy" label="流れとは">
          <p className="entry-eyebrow">一本の流れ</p>
          <h2 className="entry-h font-display">
            運は、当たり外れではなく
            <br />
            満ち欠けで巡る。
          </h2>
          <p className="entry-p">
            月は満ちて欠け、節気は巡り、干支は六十日で一周する。
            そのどれもが今日という一点で交わっている。
            流れは、その交わりを一本の線として描きます。
          </p>
        </Act>

        {/* ── 三幕：二十四の彩 ── */}
        {!compact && (
          <Act className="entry-sekki" label="二十四節気の彩">
            <div ref={sekkiRef as React.RefObject<HTMLDivElement>} className="entry-sekki-track">
              <p className="entry-eyebrow">二十四の彩</p>
              <h2 className="entry-h font-display">
                季節に、
                <br />
                色の名前がある。
              </h2>
              <p className="entry-p">
                立春の若草から大寒の瑠璃紺まで。二十四の節気に日本の伝統色を当て、
                画面の彩りを一年かけて移ろわせます。スクロールすると、その一年が流れます。
              </p>
              <ul className="entry-swatches">
                {/* [data-sekki] は素の属性セレクタなので、li に載せるとその要素の
                    --sekki-l/-d が差し替わる。地の明暗で -l/-d を選ぶのは CSS 側。 */}
                {SEKKI_COLOR_LIST.map((s) => (
                  <li key={s.key} data-sekki={s.key}>
                    <span className="entry-swatch" />
                    <span className="entry-swatch-name">{s.name}</span>
                    <span className="entry-swatch-iro">{s.colorName}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Act>
        )}

        {/* ── 四幕：読むもの ── */}
        <Act className="entry-copy" label="読むもの">
          <p className="entry-eyebrow">読むもの</p>
          <h2 className="entry-h font-display">
            今日の一日と、
            <br />
            数年ぶんの季節。
          </h2>
          <ul className="entry-list">
            <li>
              <b>今日</b>
              <span>月相・六曜・節気・選日・食・ボイド・逆行・バイオリズムを束ねた一日の流れ</span>
            </li>
            <li>
              <b>大きな流れ</b>
              <span>九星の回座・余白の年・節目の年・運気の冬・木星土星の回帰でみる人生の周期</span>
            </li>
            <li>
              <b>生まれ</b>
              <span>四柱推命の命式、宿曜の本命宿、六星占術、九星の吉方位</span>
            </li>
            <li>
              <b>暦</b>
              <span>二十八宿と、六曜・節気・開運日を載せた月のカレンダー</span>
            </li>
            <li>
              <b>事典</b>
              <span>星座・九星・二十七宿・運気の解説をひととおり</span>
            </li>
          </ul>
        </Act>

        {/* ── 五幕：はじまり ── */}
        <Act className="entry-begin" label="はじめる">
          <p className="entry-eyebrow">はじまり</p>
          <h2 className="entry-h font-display">生年月日だけで。</h2>
          <p className="entry-p">
            必要なのは生年月日ひとつ。時刻と性別は任意です。
            入力は端末内にのみ保存され、外部には送信されません。
          </p>
          <Onboarding onSubmit={onSubmit} embedded />
        </Act>
      </main>
    </>
  );
}
