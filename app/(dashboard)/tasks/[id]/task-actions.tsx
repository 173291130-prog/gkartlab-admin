"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TaskActionsProps = {
  taskId: string;
  canRegenerate: boolean;
  hasGenerated: boolean;
};

export function TaskActions({ taskId, canRegenerate, hasGenerated }: TaskActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [message, setMessage] = useState("");

  async function refreshStatus() {
    setLoading("refresh");
    setMessage("");

    const response = await fetch(`/api/tasks/${taskId}/refresh`, { method: "POST" });
    const data = await response.json().catch(() => null);

    if (!response.ok || data?.success === false) {
      setMessage(data?.error?.message ?? "暂无可刷新的 AI 任务");
    }

    setLoading("");
    router.refresh();
  }

  async function regenerate() {
    if (!canRegenerate) {
      setMessage("当前图片还没有公网访问地址。请确认公网地址已配置，或粘贴公网图片 URL 后点击“替换并生成”。");
      return;
    }

    setLoading("submit");
    setMessage("");

    const response = await fetch(`/api/tasks/${taskId}/submit`, { method: "POST" });
    const data = await response.json().catch(() => null);

    if (!response.ok || data?.success === false) {
      setMessage(data?.error?.message ?? "提交失败，请稍后重试");
    }

    setLoading("");
    router.refresh();
  }

  async function reviseGeneratedImage() {
    const prompt = revisionPrompt.trim();
    if (!prompt) {
      setMessage("请先填写顾客的修改意见。");
      return;
    }

    if (!hasGenerated) {
      setMessage("当前任务还没有生成图，请先生成图片后再继续修改。");
      return;
    }

    setLoading("revision");
    setMessage("");

    const response = await fetch(`/api/tasks/${taskId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisionPrompt: prompt }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || data?.success === false) {
      setMessage(data?.error?.message ?? "提交修改失败，请稍后重试");
    } else {
      setRevisionPrompt("");
    }

    setLoading("");
    router.refresh();
  }

  async function replaceUrlAndGenerate() {
    const url = imageUrl.trim();
    if (!url) {
      setMessage("请先粘贴公网图片 URL。正常上传本地图片时，这里可以留空。");
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      setMessage("图片 URL 需要以 http:// 或 https:// 开头。");
      return;
    }

    setLoading("replace");
    setMessage("");

    const form = new FormData();
    form.set("taskId", taskId);
    form.set("imageUrl", url);

    const uploadResponse = await fetch("/api/uploads", { method: "POST", body: form });
    const uploadData = await uploadResponse.json().catch(() => null);
    if (!uploadResponse.ok || uploadData?.success === false) {
      setLoading("");
      setMessage(uploadData?.error?.message ?? "替换图片失败");
      return;
    }

    const submitResponse = await fetch(`/api/tasks/${taskId}/submit`, { method: "POST" });
    const submitData = await submitResponse.json().catch(() => null);
    if (!submitResponse.ok || submitData?.success === false) {
      setMessage(submitData?.error?.message ?? "提交失败，请稍后重试");
    }

    setLoading("");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-wrap items-start gap-3">
      <Button variant="outline" disabled={Boolean(loading)} onClick={refreshStatus}>
        <RefreshCw className="h-4 w-4" />
        {loading === "refresh" ? "刷新中" : "刷新状态"}
      </Button>
      <Button disabled={Boolean(loading)} onClick={regenerate}>
        <Wand2 className="h-4 w-4" />
        {loading === "submit" ? "提交中" : "重新生成"}
      </Button>

      <div className="flex min-w-[420px] flex-1 items-center gap-2">
        <Input
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="公网图片 URL，用于替换当前原图并重新生成"
        />
        <Button type="button" variant="outline" disabled={Boolean(loading)} onClick={replaceUrlAndGenerate}>
          {loading === "replace" ? "提交中" : "替换并生成"}
        </Button>
      </div>

      <div className="w-full rounded-lg border border-border bg-white p-4">
        <div className="mb-2 text-sm font-medium">顾客修改意见</div>
        <Textarea
          value={revisionPrompt}
          onChange={(event) => setRevisionPrompt(event.target.value)}
          placeholder="例如：把背景改浅一点、人物脸部更自然、保留主体不变、增加厚涂肌理感"
        />
        <div className="mt-3 flex justify-end">
          <Button type="button" disabled={Boolean(loading) || !hasGenerated} onClick={reviseGeneratedImage}>
            <Wand2 className="h-4 w-4" />
            {loading === "revision" ? "提交修改中" : "按修改意见生成"}
          </Button>
        </div>
      </div>

      {message ? <div className="w-full text-sm text-red-600">{message}</div> : null}
    </div>
  );
}
