import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '流れ — 天体・暦・命術で今の流れを読む',
    short_name: '流れ',
    description:
      '生年月日から、天体の動き・星座・暦・生まれの傾向をひとつに束ね、今日の流れと大きな流れを読み解くアプリ。',
    start_url: '/',
    display: 'standalone',
    background_color: '#10142a',
    theme_color: '#10142a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
