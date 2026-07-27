import type { Metadata } from 'next';
import { OG_IMAGE, SITE_NAME, SITE_TITLE } from '@/lib/site';

const OG_DESCRIPTION =
  '二十四節気に日本の伝統色を当て、実時刻の空の上で今日の流れを読む。生年月日ひとつではじまります。';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description:
    '月は満ちて欠け、節気は巡り、干支は六十日で一周する。そのどれもが今日という一点で交わっている。生年月日ひとつで、今日の流れと大きな流れを読み解くアプリ。',
  alternates: { canonical: '/welcome' },
  // openGraph は親とマージされず丸ごと差し替わるため、画像もここで明示する
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: SITE_NAME,
    url: '/welcome',
    title: SITE_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
