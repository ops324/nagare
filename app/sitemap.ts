import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * sitemap.xml。
 *
 * **`url` は絶対URLでなければならない。** sitemap プロトコルは `<loc>` に絶対URLを要求し、
 * かつ `metadataBase` は sitemap には効かない（OGP と違って Next が絶対化してくれない）。
 * 相対パスで書くと `<loc>/</loc>` が配信され、検索エンジンに弾かれる。
 * `__tests__/site-url.test.ts` が機械的に固定している。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/welcome`, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
