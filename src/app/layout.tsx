import type { Metadata } from "next";
import { Inter, Noto_Serif_SC, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { StarryBackground } from "@/components/shared/StarryBackground";
import { SessionProviderWrapper } from "@/components/providers/SessionProviderWrapper";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "QuasarFrame — 数字地球摄影选景平台",
  description:
    "基于数字地球与实景三维数据，在虚拟时空中确定拍摄地点、机位与成片效果，引导摄影爱好者前往拍摄。",
  keywords: "摄影, 选景, 数字地球, 星空, 云海, 日落, 电子相框",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${serif.variable} ${mono.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
        <SessionProviderWrapper>
          <StarryBackground />
          <Navbar />
          <main className="relative z-10 pt-16 md:pb-0 pb-16">
            {children}
          </main>
          <MobileNav />
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
