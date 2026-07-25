import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: '/', changeFrequency: 'daily', priority: 1 }];
}
