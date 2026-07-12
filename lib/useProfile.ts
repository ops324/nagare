'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BirthProfile } from './types';

const KEY = 'nagare.profile.v1';

interface State {
  profile: BirthProfile | null;
  loaded: boolean;
}

/**
 * 生年月日プロフィールを localStorage に保存・読込するフック。
 * SSR と初回クライアント描画は loaded=false（スプラッシュ）で一致させ、
 * マウント後に端末保存の値を読み込む＝ハイドレーション不一致・オンボーディングのちらつきを防ぐ。
 */
export function useProfile() {
  const [state, setState] = useState<State>({ profile: null, loaded: false });

  useEffect(() => {
    let profile: BirthProfile | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) profile = JSON.parse(raw) as BirthProfile;
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント時に端末保存の値を一度だけ読み込む意図的なゲート
    setState({ profile, loaded: true });
  }, []);

  const setProfile = useCallback((p: BirthProfile) => {
    setState({ profile: p, loaded: true });
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  const clear = useCallback(() => {
    setState({ profile: null, loaded: true });
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { profile: state.profile, setProfile, clear, loaded: state.loaded };
}
