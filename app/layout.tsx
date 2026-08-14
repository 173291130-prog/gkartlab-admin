import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "广开艺造 AI 工作台",
  description: "广开艺造内部 AI 业务工作台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
