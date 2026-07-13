"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type TaskProgressProps = {
  taskId: string;
  initialStatus: string;
  latestError?: string | null;
};

const ACTIVE_STATUSES = new Set(["SUBMITTED", "PROCESSING"]);

export function TaskProgress({ taskId, initialStatus, latestError }: TaskProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(latestError ?? "");
  const [pollCount, setPollCount] = useState(0);
  const isActive = ACTIVE_STATUSES.has(status);

  useEffect(() => {
    setStatus(initialStatus);
    setError(latestError ?? "");
  }, [initialStatus, latestError]);

  useEffect(() => {
    if (!isActive) return;

    let stopped = false;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/refresh`, { method: "POST" });
        const data = await response.json().catch(() => null);
        setPollCount((value) => value + 1);

        if (stopped) return;

        if (!response.ok || data?.success === false) {
          setError(data?.error?.message ?? "状态刷新失败，系统会继续自动重试。");
          return;
        }

        const nextStatus = data?.data?.status;
        if (nextStatus) setStatus(nextStatus);

        if (data?.data?.status === "PROCESSING" && data?.data?.message) {
          setError(data.data.message);
        } else {
          setError("");
        }

        if (nextStatus === "SUCCEEDED" || nextStatus === "FAILED") {
          window.clearInterval(timer);
          router.refresh();
        }
      } catch {
        setError("本次状态刷新失败，系统会继续自动重试。");
      }
    }, 8000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [isActive, router, taskId]);

  const content = useMemo(() => {
    if (status === "SUCCEEDED") {
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        title: "生成成功",
        description: "生成图已保存，页面会自动展示结果。",
      };
    }

    if (status === "FAILED") {
      return {
        icon: <XCircle className="h-5 w-5 text-red-600" />,
        className: "border-red-200 bg-red-50 text-red-900",
        title: "生成失败",
        description: error || "AI 平台返回失败，请查看下方生成记录。",
      };
    }

    if (isActive) {
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin text-amber-600" />,
        className: "border-amber-200 bg-amber-50 text-amber-950",
        title: status === "SUBMITTED" ? "已提交，等待 AI 开始处理" : "AI 正在生成中",
        description: error || `系统会自动刷新状态，生成完成后自动显示结果。已自动刷新 ${pollCount} 次。`,
      };
    }

    return {
      icon: null,
      className: "border-slate-200 bg-white text-slate-700",
      title: "等待提交",
      description: "任务已创建，提交生成后这里会显示进度。",
    };
  }, [error, isActive, pollCount, status]);

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${content.className}`}>
      {content.icon}
      <div>
        <div className="font-medium">{content.title}</div>
        <div className="mt-0.5 text-xs opacity-80">{content.description}</div>
      </div>
    </div>
  );
}
