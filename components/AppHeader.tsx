'use client';

import { useState } from 'react';
import { toJstParts } from '@/lib/time';
import { warekiLabel, weekdayJa } from '@/lib/format';

export function AppHeader({ now, sub }: { now: Date; sub?: string }) {
  const p = toJstParts(now);
  const [toast, setToast] = useState(false);

  function flashToast() {
    setToast(true);
    window.setTimeout(() => setToast(false), 1800);
  }

  async function copyUrl(url: string): Promise<boolean> {
    // 第一候補：Clipboard API（要セキュアコンテキスト・ユーザー操作）
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch {
      // 権限ポリシー等で失敗した場合はレガシー方式へフォールバック
    }
    // 第二候補：execCommand（旧ブラウザ・制限環境向け）
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function onShare() {
    const url = window.location.href;
    const shareData = {
      title: '流れ',
      text: '天体・暦・命術で今の流れを読む — 流れ',
      url,
    };
    // モバイル／対応ブラウザはネイティブシェートを優先
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // ユーザーがシェートを閉じた／失敗した場合はコピーにフォールバック
      }
    }
    if (await copyUrl(url)) flashToast();
  }

  return (
    <header className="appbar">
      <div className="appbar-mark">
        流<span>れ</span>
      </div>
      <div className="appbar-date">
        <div>
          {warekiLabel(p.year, p.month, p.day)}
          <b>
            {' '}
            {p.month}月{p.day}日
          </b>
          （{weekdayJa(p.weekday)}）
        </div>
        {sub && <div style={{ color: 'var(--text-faint)' }}>{sub}</div>}
      </div>
      <button
        type="button"
        className="appbar-share"
        onClick={onShare}
        aria-label="このアプリをシェア"
        title="シェア"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v13M12 3l-4 4M12 3l4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {toast && <div className="appbar-toast" role="status">リンクをコピーしました</div>}
    </header>
  );
}
