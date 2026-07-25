'use client';

import { useProfile } from '@/lib/useProfile';
import { Dashboard } from '@/components/Dashboard';
import { SkyField } from '@/components/SkyField';
import { EntryExperience } from '@/components/entry/EntryExperience';

export default function Page() {
  const { profile, setProfile, clear, loaded } = useProfile();

  if (!loaded) {
    return (
      <main className="splash">
        <SkyField />
        <div className="splash-mark font-display">流れ</div>
      </main>
    );
  }

  // 未登録なら入口体験（幕を絞った compact 版）。ゲートの形は変えていない。
  if (!profile) {
    return <EntryExperience compact onSubmit={setProfile} />;
  }

  return <Dashboard birth={profile} onReset={clear} />;
}
