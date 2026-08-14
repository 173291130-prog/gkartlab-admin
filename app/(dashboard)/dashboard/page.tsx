import Link from "next/link";
import { ArrowRight, Palette, PawPrint, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export default async function DashboardPage() {
  const user = await requireUser();
  const paintingCount = await prisma.task.count();
  return <>
    <Topbar title="统一工作台" userName={user.name} />
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <section className="rounded-2xl bg-[#153f34] p-8 text-white">
        <p className="text-sm text-emerald-100/70">早上好，{user.name}</p>
        <h2 className="mt-2 text-3xl font-semibold">今天要使用哪个 AI 工具？</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/65">统一账号进入不同业务生产线。当前优先建设宠物医疗耗材小红书获客智能体，其他工具按业务需要逐步接入。</p>
      </section>
      <div>
        <div className="mb-4 flex items-end justify-between"><div><h3 className="text-lg font-semibold">业务智能体</h3><p className="mt-1 text-sm text-muted-foreground">选择一个工具开始工作</p></div><span className="text-xs text-muted-foreground">2 个工具</span></div>
        <div className="grid gap-5 md:grid-cols-2">
          <Link href="/pet-content" className="group rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-[#17604b]"><PawPrint /></span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-[#17604b]">第一阶段 · 建设中</span></div>
            <h4 className="mt-6 text-xl font-semibold">宠物耗材小红书智能体</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">产品资料 → AI 选题 → AI 图片 → AI 配文 → 审核 → 发布队列</p>
            <div className="mt-6 flex items-center font-medium text-[#17604b]">进入智能体 <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1"/></div>
          </Link>
          <Link href="/tasks/new" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-sky-700"><Palette /></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">已运行 · {paintingCount} 个任务</span></div>
            <h4 className="mt-6 text-xl font-semibold">AI 肌理画出图</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">上传客户照片，生成厚涂油画、肌理画与无框画效果图。</p>
            <div className="mt-6 flex items-center font-medium text-sky-700">新建出图任务 <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1"/></div>
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-5 text-sm text-muted-foreground"><Plus className="mr-2 inline h-4 w-4"/>工作台架构已预留，后续可按需接入更多 AI 业务，不影响现有工具。</div>
    </div>
  </>;
}
