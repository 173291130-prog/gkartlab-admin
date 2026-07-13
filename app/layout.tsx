import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI照片厚涂油画出图系统",
  description: "客服内部 AI 出图后台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
