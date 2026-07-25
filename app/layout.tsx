import type { Metadata, Viewport } from "next";
import { Shippori_Mincho, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

/**
 * 和文フォントは `subsets` に関わらず CJK の @font-face が全て配信される
 * （subsets はプリロード対象の選択であって字形の間引きではない）。
 * 問題は入れ替わり（FOUT）の方で、既定の `adjustFontFallback` が
 * ラテン参照字形からメトリクスを合成するため、CJK では上書き値が合わずに
 * ワードマークやスコア数字がガタつく。CJK 実体を持つ端末フォントを
 * `fallback` に明示し、合成メトリクスは無効化する。
 */
const mincho = Shippori_Mincho({
  weight: ["500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mincho",
  preload: false,
  fallback: ["Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "serif"],
  adjustFontFallback: false,
});

const gothic = Noto_Sans_JP({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-gothic",
  preload: false,
  fallback: ["Hiragino Sans", "Yu Gothic", "YuGothic", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "流れ — 天体・暦・命術で今の流れを読む",
  description:
    "生年月日から、天体の動き・星座・暦・生まれの傾向をひとつに束ね、『今日の流れ』と『大きな流れ』を読み解くアプリ。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "流れ",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfaf1" },
    { media: "(prefers-color-scheme: dark)", color: "#10142a" },
  ],
  width: "device-width",
  initialScale: 1,
  // PWA 全画面時にステータスバー／ノッチ下まで描画を広げ、
  // env(safe-area-inset-*) を有効化する（.appbar / .navbar が参照）。
  viewportFit: "cover",
};

/**
 * 初回描画前に空の状態（data-sky）を近似バンドで仮決めする（FOUC 回避）。
 * 太陽高度による精密な判定は SkyField がマウント直後に上書きする。
 * data-theme の上書き（dark→夜 / light→昼）もここで尊重する。
 *
 * React に <script> 要素として描画させると React 19 が
 * 「クライアント描画では実行されない」旨の Console Error を出すため、
 * ラッパー div の dangerouslySetInnerHTML で HTML 文字列として注入する。
 * SSR の HTML に生の <script> として載る＝パーサーが本文の描画前に実行する点は同じ。
 */
const SKY_BOOT = `(function(){try{var d=document.documentElement;var t=d.getAttribute('data-theme');var s;if(t==='dark'){s='night';}else if(t==='light'){s='day';}else{var h=(new Date().getUTCHours()+9)%24;if(h>=7&&h<16){s='day';}else if(h>=4&&h<7){s='dawn';}else if(h>=16&&h<19){s='dusk';}else{s='night';}}d.setAttribute('data-sky',s);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${mincho.variable} ${gothic.variable}`} suppressHydrationWarning>
      <body>
        <div
          hidden
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: `<script>${SKY_BOOT}</script>` }}
        />
        {children}
      </body>
    </html>
  );
}
