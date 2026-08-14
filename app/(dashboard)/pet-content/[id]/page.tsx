import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

type ImagePlan={page:number;type:string;headline:string;description:string};
export default async function PetContentResultPage({params}:{params:Promise<{id:string}>}){
  const user=await requireUser(); const {id}=await params;
  const item=await prisma.petContentGeneration.findUnique({where:{id},include:{product:true}}); if(!item) notFound();
  const titles=item.titlesJson as string[]; const hashtags=item.hashtagsJson as string[]; const plans=item.imagePlansJson as ImagePlan[];
  return <><Topbar title="生成结果详情" userName={user.name}/><div className="mx-auto max-w-7xl space-y-5 p-8"><Link href="/pet-content" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/>返回智能体</Link><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-[#17604b]"><Check className="mr-2 inline h-4 w-4"/>已通过真实性复核并写入数据库 · 文字模型：{item.model}</div><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border bg-white p-6"><p className="text-xs text-muted-foreground">今日选题</p><h2 className="mt-2 text-xl font-semibold">{item.topic}</h2><h3 className="mb-2 mt-6 font-semibold">3 个标题</h3>{titles.map((x,i)=><div key={x} className="mt-2 rounded-lg border p-3 text-sm"><span className="mr-3 text-[#17604b]">0{i+1}</span>{x}</div>)}<h3 className="mb-2 mt-6 font-semibold">正文</h3><div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-7">{item.content}</div><div className="mt-4 flex flex-wrap gap-2">{hashtags.map(x=><span key={x} className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-[#17604b]">{x.startsWith("#")?x:`#${x}`}</span>)}</div></section><section className="rounded-2xl border bg-white p-6"><h3 className="font-semibold">5 张图片方案</h3><p className="mt-1 text-xs text-muted-foreground">本阶段仅生成方案，尚未调用图片模型</p><div className="mt-5 space-y-3">{plans.map(plan=><div key={plan.page} className="rounded-xl border p-4"><div className="flex items-center justify-between"><b className="text-sm">第 {plan.page} 张 · {plan.headline}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">{plan.type}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{plan.description}</p></div>)}</div></section></div></div></>;
}
