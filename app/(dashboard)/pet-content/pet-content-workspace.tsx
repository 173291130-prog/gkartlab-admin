"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ImagePlus, Package, PawPrint, Sparkles } from "lucide-react";

export function PetContentWorkspace() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/pet-content/generate", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || "生成失败");
      router.push(`/pet-content/${result.data.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成失败，请稍后重试");
      setGenerating(false);
    }
  }

  if (generating) return <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-8"><div className="text-center"><Sparkles className="mx-auto h-12 w-12 animate-pulse text-[#17604b]"/><h2 className="mt-5 text-2xl font-semibold">正在调用 GPT 生成今日内容</h2><p className="mt-2 text-sm text-muted-foreground">读取真实产品资料与历史选题，生成后执行第二次真实性复核</p><div className="mx-auto mt-7 h-2 w-80 overflow-hidden rounded-full bg-slate-200"><i className="block h-full w-3/4 animate-pulse rounded-full bg-[#17604b]"/></div><p className="mt-5 text-xs text-muted-foreground">通常需要 15～60 秒，请勿重复点击</p></div></div>;

  return <div className="mx-auto max-w-7xl space-y-6 p-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-[#17604b]">第一阶段核心流水线</p><h2 className="mt-1 text-2xl font-semibold">真实资料驱动的小红书内容生产</h2></div><button onClick={generate} className="flex items-center gap-2 rounded-lg bg-[#174d3b] px-5 py-3 text-sm font-semibold text-white shadow-sm"><Sparkles className="h-4 w-4"/>生成今日小红书</button></div>
    {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><b>生成失败：</b>{error}</div> : null}
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4 text-xs">{["读取产品资料","读取历史选题","GPT 结构化生成","真实性复核","写入数据库","结果详情"].map((x,i)=><div key={x} className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{x}</span>{i<5&&<ChevronRight className="h-3 w-3 text-slate-300"/>}</div>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-2xl border bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-[#17604b]"><Package/></span><div><h3 className="font-semibold">当前产品资料</h3><p className="text-xs text-muted-foreground">数据库是 AI 唯一事实来源</p></div><span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs text-[#17604b]">真实性保护开启</span></div><div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2"><div><small className="text-muted-foreground">品牌</small><p className="mt-1 font-medium">百仕韦</p></div><div><small className="text-muted-foreground">产品</small><p className="mt-1 font-medium">动物专用一次性使用静脉留置针</p></div><div><small className="text-muted-foreground">规格</small><p className="mt-1 font-medium">22G / 24G / 26G</p></div><div><small className="text-muted-foreground">包装</small><p className="mt-1 font-medium">100 支/盒</p></div></div><p className="mt-4 text-xs leading-6 text-muted-foreground">未录入的适用动物、具体尺寸、针长、流速、治疗效果、厂家功效等信息，GPT 不得推测或补充。</p></section>
      <section className="rounded-2xl border bg-[#153f34] p-6 text-white"><PawPrint className="h-8 w-8 text-amber-200"/><h3 className="mt-5 text-xl font-semibold">本阶段真实能力</h3><p className="mt-3 text-sm leading-7 text-emerald-50/70">真实调用 GPT，生成选题、3 个标题、正文、标签和 5 张图片方案，通过真实性复核后写入数据库。</p><div className="mt-6 flex items-center gap-3 rounded-xl bg-white/10 p-4"><ImagePlus/><div><b className="text-sm">图片模型尚未调用</b><p className="text-xs text-emerald-50/60">确认文字接口稳定后再接入背景生成与程序合成</p></div></div></section>
    </div>
  </div>;
}
