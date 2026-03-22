import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MaisokuDB - 不動産投資分析アプリ",
  description:
    "物件情報をAIで自動読み取り。収益シミュレーション・物件比較・出口予測まで、不動産投資の意思決定をサポートするモバイルアプリ。",
  openGraph: {
    title: "MaisokuDB - 不動産投資分析アプリ",
    description:
      "物件情報をAIで自動読み取り。収益シミュレーション・物件比較・出口予測まで、不動産投資の意思決定をサポート。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
