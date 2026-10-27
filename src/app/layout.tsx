import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { StarryBackground } from "@/components/shared/StarryBackground";
import { SessionProviderWrapper } from "@/components/providers/SessionProviderWrapper";
import "./globals.css";

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
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
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
