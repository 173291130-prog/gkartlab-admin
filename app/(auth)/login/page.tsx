import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7f6] px-4">
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl" />
      <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-amber-100/60 blur-3xl" />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1.05fr_.95fr]">
        <section className="hidden bg-[#123f34] p-12 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="mb-14 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-lg">广</span><div><b>广开艺造</b><p className="text-xs tracking-widest text-emerald-100/60">GK ART LAB</p></div></div>
            <p className="text-sm font-medium text-amber-200">AI 工作台</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">一个入口，连接每一条<br/>AI 业务生产线。</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-emerald-50/70">现阶段优先跑通宠物耗材小红书智能获客，同时保留肌理画出图业务。</p>
          </div>
          <div className="flex gap-2 text-xs text-emerald-50/70"><span className="rounded-full border border-white/15 px-3 py-1.5">宠物耗材获客</span><span className="rounded-full border border-white/15 px-3 py-1.5">肌理画出图</span></div>
        </section>
        <div className="p-8 md:p-12">
          <div className="mb-8">
            <p className="text-sm font-medium text-[#17604b]">广开艺造 AI 工作台</p>
            <h1 className="mt-3 text-2xl font-semibold">欢迎回来</h1>
            <p className="mt-2 text-sm text-muted-foreground">使用内部账号登录统一工作台</p>
          </div>
          <LoginForm />
          <p className="mt-8 text-center text-xs text-muted-foreground">内部系统 · 请勿向外部人员分享账号</p>
        </div>
      </div>
    </main>
  );
}
