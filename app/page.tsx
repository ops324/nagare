'use client';

import { useProfile } from '@/lib/useProfile';
import { Onboarding } from '@/components/Onboarding';
import { Dashboard } from '@/components/Dashboard';

export default function Page() {
  const { profile, setProfile, clear, loaded } = useProfile();

  if (!loaded) {
    return (
      <main className="splash">
        <div className="splash-mark font-display">流れ</div>
      </main>
    );
  }

  if (!profile) {
    return <Onboarding onSubmit={setProfile} />;
  }

  return <Dashboard birth={profile} onReset={clear} />;
}
