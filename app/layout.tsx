import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { SyncProvider } from "@/components/SyncProvider";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "多益神器 · TOEIC Master",
  description: "爬取單字、AI 出題、間隔複習，一站搞定多益準備。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className={`${geist.variable} ${fraunces.variable} antialiased`}>
      <body>
        <SyncProvider>
          <div className="relative z-[2] mx-auto flex min-h-screen max-w-5xl flex-col px-5 pb-20">
            <NavBar />
            <main className="flex-1">{children}</main>
            <footer className="mt-16 border-t border-line pt-6 text-xs text-muted">
              多益神器 · 單字爬取與例句來自免費字典 API；練習題免費離線生成。僅供學習使用。
            </footer>
          </div>
        </SyncProvider>
      </body>
    </html>
  );
}
