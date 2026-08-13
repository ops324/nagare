import { describe, expect, it } from 'vitest';
import sitemap from '../app/sitemap';
import robots from '../app/robots';
import { OG_IMAGE, SITE_URL } from '../lib/site';

/**
 * 絶対URLの構造テスト。
 *
 * 一度やらかしている2点を機械的に固定する：
 *  ① `SITE_URL` が Vercel のデプロイURL（`nagare-<hash>-<team>.vercel.app`）を指していた。
 *     デプロイを消すと 410 になり、OGP画像・canonical・sitemap がまとめて死ぬ。
 *     さらにプロジェクト名つきURLは Deployment Protection の対象で、クローラが SSO へ飛ばされる。
 *  ② `sitemap.ts` が相対パスを返していた。`<loc>` は絶対URL必須で、
 *     **`metadataBase` は sitemap には効かない**（OGP と違って Next が絶対化してくれない）。
 *
 * 占術ロジックには一切関与しない。ここで壊れるのは「外から見つけてもらう経路」だけ。
 */

/** Vercel が自動発行するデプロイURL。消えると 410 になるので基点にしてはならない。 */
const EPHEMERAL_VERCEL_URL = /^https:\/\/[a-z0-9-]+-[a-z0-9]{9,}-[a-z0-9-]+\.vercel\.app/;

describe('SITE_URL', () => {
  it('https の絶対URLで、末尾スラッシュを持たない', () => {
    expect(SITE_URL).toMatch(/^https:\/\//);
    expect(SITE_URL.endsWith('/')).toBe(false);
    expect(() => new URL(SITE_URL)).not.toThrow();
  });

  it('パス・クエリ・ハッシュを含まない（metadataBase の基点なので）', () => {
    const u = new URL(SITE_URL);
    expect(u.pathname).toBe('/');
    expect(u.search).toBe('');
    expect(u.hash).toBe('');
  });

  it('消えうる Vercel のデプロイURLを指していない', () => {
    expect(SITE_URL).not.toMatch(EPHEMERAL_VERCEL_URL);
  });

  it('OGP画像が SITE_URL から絶対URLに解決できる', () => {
    const abs = new URL(OG_IMAGE.url, SITE_URL).toString();
    expect(abs).toBe(`${SITE_URL}/og.png`);
  });
});

describe('sitemap.xml', () => {
  const entries = sitemap();

  it('空ではない', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('全エントリが SITE_URL 始まりの絶対URL（相対パスを1件も混ぜない）', () => {
    for (const e of entries) {
      expect(e.url, `sitemap entry: ${e.url}`).toMatch(/^https:\/\//);
      expect(e.url.startsWith(`${SITE_URL}/`), `sitemap entry: ${e.url}`).toBe(true);
    }
  });

  it('URL が重複していない', () => {
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('常設の2ルート（トップと入口体験）を含む', () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/welcome`);
  });
});

describe('robots.txt', () => {
  it('sitemap を絶対URLで宣言している', () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
