import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '流れ — 天体・暦・命術で今の流れを読む',
  description:
    '月は満ちて欠け、節気は巡り、干支は六十日で一周する。そのどれもが今日という一点で交わっている。生年月日ひとつで、今日の流れと大きな流れを読み解くアプリ。',
  alternates: { canonical: '/welcome' },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: '流れ',
    title: '流れ — 天体・暦・命術で今の流れを読む',
    description:
      '二十四節気に日本の伝統色を当て、実時刻の空の上で今日の流れを読む。生年月日ひとつではじまります。',
  },
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
