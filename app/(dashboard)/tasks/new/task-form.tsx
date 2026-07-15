"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiTemplate } from "@prisma/client";
import { Image as ImageIcon, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PLATFORM_OPTIONS } from "@/config/platforms";
import { SIZE_OPTIONS } from "@/config/sizes";
import { cn } from "@/lib/utils";

type ImageAnalysis = {
  width: number;
  height: number;
  ratio: number;
  ratioText: string;
  orientation: string;
};

export function NewTaskForm({ templates }: { templates: AiTemplate[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState("TAOBAO");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [sizeMode, setSizeMode] = useState<"PRESET" | "CUSTOM">("PRESET");
  const [sizePreset, setSizePreset] = useState("auto");
  const [preview, setPreview] = useState("");
  const [publicImageUrl, setPublicImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [calcWidth, setCalcWidth] = useState("30");
  const [calcHeight, setCalcHeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function pickFile(nextFile?: File) {
    if (!nextFile) return;

    const nextPreview = URL.createObjectURL(nextFile);
    setFile(nextFile);
    setPreview(nextPreview);
    setPublicImageUrl("");
    setAnalysis(null);

    const image = new Image();
    image.onload = () => {
      const nextAnalysis = analyzeImageSize(image.naturalWidth, image.naturalHeight);
      setAnalysis(nextAnalysis);
      setCalcWidth("30");
      setCalcHeight(formatNumber(30 / nextAnalysis.ratio));
    };
    image.src = nextPreview;
  }

  function pickPublicUrl(value: string) {
    setPublicImageUrl(value);
    if (!value.trim()) return;

    setFile(null);
    setPreview(value.trim());
    setAnalysis(null);

    const image = new Image();
    image.onload = () => {
      const nextAnalysis = analyzeImageSize(image.naturalWidth, image.naturalHeight);
      setAnalysis(nextAnalysis);
      setCalcWidth("30");
      setCalcHeight(formatNumber(30 / nextAnalysis.ratio));
    };
    image.src = value.trim();
  }

  function updateCalcWidth(value: string) {
    setCalcWidth(value);
    if (!analysis || Number(value) <= 0) {
      setCalcHeight("");
      return;
    }
    setCalcHeight(formatNumber(Number(value) / analysis.ratio));
  }

  function updateCalcHeight(value: string) {
    setCalcHeight(value);
    if (!analysis || Number(value) <= 0) {
      setCalcWidth("");
      return;
    }
    setCalcWidth(formatNumber(Number(value) * analysis.ratio));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!file && !publicImageUrl.trim()) {
      setError("请先上传图片，或粘贴一张公网图片 URL。");
      return;
    }

    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const taskResponse = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName") || undefined,
          customerPhone: form.get("customerPhone") || undefined,
          orderNo: form.get("orderNo") || undefined,
          requestedWidth: form.get("requestedWidth") || undefined,
          requestedHeight: form.get("requestedHeight") || undefined,
          platform,
          templateId,
          sizeMode,
          sizePreset: sizeMode === "PRESET" ? sizePreset : undefined,
          customWidth: sizeMode === "CUSTOM" ? form.get("customWidth") : undefined,
          customHeight: sizeMode === "CUSTOM" ? form.get("customHeight") : undefined,
        }),
      });
      const taskData = await taskResponse.json();
      if (!taskData.success) {
        setError(taskData.error?.message ?? "保存任务失败");
        return;
      }

      const uploadForm = new FormData();
      uploadForm.set("taskId", taskData.data.id);
      if (publicImageUrl.trim()) {
        uploadForm.set("imageUrl", publicImageUrl.trim());
      } else if (file) {
        uploadForm.set("file", file);
      }
      if (analysis) {
        uploadForm.set("width", String(analysis.width));
        uploadForm.set("height", String(analysis.height));
      }

      const uploadResponse = await fetch("/api/uploads", { method: "POST", body: uploadForm });
      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        setError(uploadData.error?.message ?? "上传失败");
        return;
      }

      const submitResponse = await fetch(`/api/tasks/${taskData.data.id}/submit`, { method: "POST" });
      const submitData = await submitResponse.json().catch(() => null);
      if (!submitResponse.ok || submitData?.success === false) {
        setError(submitData?.error?.message ?? "提交 AI 失败");
        return;
      }

      router.push(`/tasks/${taskData.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-[1fr_360px] gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">客户信息</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Input name="customerName" placeholder="客户姓名，可选" />
            <Input name="customerPhone" placeholder="联系电话，可选" />
            <Input name="orderNo" placeholder="订单号，可选" />
            <Select value={platform} onValueChange={setPlatform} options={[...PLATFORM_OPTIONS]} />
            <div className="col-span-2">
              <div className="mb-2 text-sm font-medium">顾客要的尺寸</div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input name="requestedWidth" type="number" min="1" placeholder="宽" />
                <span className="text-sm text-muted-foreground">*</span>
                <Input name="requestedHeight" type="number" min="1" placeholder="高" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">上传图片</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={publicImageUrl}
              onChange={(event) => pickPublicUrl(event.target.value)}
              placeholder="公网图片 URL，可选；正常使用时直接上传本地图片即可"
            />
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={(event) => {
                event.preventDefault();
                pickFile(event.dataTransfer.files[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
              className="flex min-h-72 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/30"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="上传预览" className="max-h-72 rounded-md object-contain" />
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <Upload className="mx-auto mb-3 h-8 w-8" />
                  拖拽图片到这里，或点击上传 jpg / png / webp
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => pickFile(event.target.files?.[0])}
            />

            {analysis ? (
              <div className="rounded-md border border-border bg-white px-3 py-3 text-sm">
                <div className="grid grid-cols-3 gap-3">
                  <AnalysisItem label="像素尺寸" value={`${analysis.width} x ${analysis.height}`} />
                  <AnalysisItem label="图片比例" value={analysis.ratioText} />
                  <AnalysisItem label="方向" value={analysis.orientation} />
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">输入宽度</label>
                    <Input type="number" min="0" step="0.1" value={calcWidth} onChange={(event) => updateCalcWidth(event.target.value)} />
                  </div>
                  <div className="pb-2 text-sm text-muted-foreground">=</div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">输入高度</label>
                    <Input type="number" min="0" step="0.1" value={calcHeight} onChange={(event) => updateCalcHeight(event.target.value)} />
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">AI 模板</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <button
                type="button"
                key={template.id}
                onClick={() => setTemplateId(template.id)}
                className={cn(
                  "w-full rounded-md border border-border p-3 text-left text-sm hover:border-primary",
                  templateId === template.id && "border-primary bg-primary/5",
                )}
              >
                <div className="font-medium">{template.name}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.description}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">尺寸设置</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={sizeMode === "PRESET" && sizePreset === "auto" ? "default" : "outline"}
                onClick={() => {
                  setSizeMode("PRESET");
                  setSizePreset("auto");
                }}
              >
                按原图尺寸
              </Button>
              {SIZE_OPTIONS.map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={sizeMode === "PRESET" && sizePreset === size ? "default" : "outline"}
                  onClick={() => {
                    setSizeMode("PRESET");
                    setSizePreset(size);
                  }}
                >
                  {size.replace("x", "x")}
                </Button>
              ))}
              <Button type="button" variant={sizeMode === "CUSTOM" ? "default" : "outline"} onClick={() => setSizeMode("CUSTOM")}>
                自定义
              </Button>
            </div>
            {sizeMode === "CUSTOM" ? (
              <div className="grid grid-cols-2 gap-2">
                <Input name="customWidth" type="number" placeholder="宽 cm" />
                <Input name="customHeight" type="number" placeholder="高 cm" />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <Button className="w-full" disabled={loading}>
          <Wand2 className="h-4 w-4" />
          {loading ? "提交中" : "提交生成"}
        </Button>
      </div>
    </form>
  );
}

function AnalysisItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function analyzeImageSize(width: number, height: number): ImageAnalysis {
  const ratio = width / height;
  const orientation = ratio > 1.05 ? "横图" : ratio < 0.95 ? "竖图" : "近似方图";
  const gcdValue = gcd(width, height);
  const ratioText = `${Math.round(width / gcdValue)}:${Math.round(height / gcdValue)}`;

  return { width, height, ratio, ratioText, orientation };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
