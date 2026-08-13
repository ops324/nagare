import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** robots.txt。`sitemap` も絶対URLで宣言する（sitemap.xml 側と同じ理由）。 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
