import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const host = (await headers()).get("host") ?? "";
  const isAdminHost = host.startsWith("admin.") || host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (isAdminHost) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium text-primary">GK Art Lab</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
          定制艺术画与 AI 视觉生产工作室
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          我们正在搭建面向客户的独立站。当前客服后台已独立部署在 admin.gkartlab.com，用于上传图片、生成厚涂油画效果图和管理订单出图流程。
        </p>
        <div className="mt-10 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="rounded-md border border-border bg-white px-4 py-2">厚涂油画</span>
          <span className="rounded-md border border-border bg-white px-4 py-2">肌理画</span>
          <span className="rounded-md border border-border bg-white px-4 py-2">无框画效果图</span>
          <span className="rounded-md border border-border bg-white px-4 py-2">高清修复</span>
        </div>
      </section>
    </main>
  );
}
