import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flow AI | 智能对话与工具调用平台",
  description: "基于 Next.js 与 Vercel AI SDK 的智能对话平台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

