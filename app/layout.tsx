import type { Metadata, Viewport } from "next";
import { Shippori_Mincho, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const mincho = Shippori_Mincho({
  weight: ["500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mincho",
  preload: false,
});

const gothic = Noto_Sans_JP({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-gothic",
  preload: false,
});

export const metadata: Metadata = {
  title: "流れ — 天体・暦・命術で今の流れを読む",
  description:
    "生年月日から、天体の動き・星座・暦・生まれの傾向をひとつに束ね、『今日の流れ』と『大きな流れ』を読み解くアプリ。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfaf1" },
    { media: "(prefers-color-scheme: dark)", color: "#10142a" },
  ],
  width: "device-width",
  initialScale: 1,
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
