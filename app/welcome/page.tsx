'use client';

import { useRouter } from 'next/navigation';
import type { BirthProfile } from '@/lib/types';
import { useProfile } from '@/lib/useProfile';
import { EntryExperience } from '@/components/entry/EntryExperience';

/**
 * 入口体験の常設ルート。
 *
 * `/` は localStorage ゲートのため、未登録の訪問者に返るプリレンダー HTML が
 * スプラッシュ画面になる。審査員・クローラー・SNS が最初に見るのがそれでは困る。
 * かといって `/` を差し替えると、`start_url: '/'` を焼き込んで
 * インストール済みの PWA が入口に着地してしまう。
 *
 * そこで **`/` はゲートごと維持し、入口は常設の別ルートに置く**。
 * こちらはゲート無しで、誰が来ても・何度来ても必ず全幕を返す。
 */
export default function WelcomePage() {
  const router = useRouter();
  const { setProfile } = useProfile();

  const onSubmit = (p: BirthProfile) => {
    setProfile(p);
    router.replace('/');
  };

  return <EntryExperience onSubmit={onSubmit} />;
}
