'use client';

import { useProfile } from '@/lib/useProfile';
import { Onboarding } from '@/components/Onboarding';
import { Dashboard } from '@/components/Dashboard';
import { SkyField } from '@/components/SkyField';

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

  if (!profile) {
    return (
      <>
        <SkyField />
        <Onboarding onSubmit={setProfile} />
      </>
    );
  }

  return <Dashboard birth={profile} onReset={clear} />;
}
