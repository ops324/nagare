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
    { media: "(prefers-color-scheme: dark)", color: "#161828" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${mincho.variable} ${gothic.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
