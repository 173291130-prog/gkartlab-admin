"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AiTemplate } from "@prisma/client";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TemplateEditForm({ template }: { template: AiTemplate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        prompt: form.get("prompt"),
        negativePrompt: form.get("negativePrompt"),
        sortOrder: form.get("sortOrder"),
        isActive: form.get("isActive") === "on",
      }),
    });
    const data = await response.json().catch(() => null);

    setSaving(false);
    if (!response.ok || data?.success === false) {
      setError(data?.error?.message ?? "保存模板失败");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        编辑提示词
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <Input name="name" defaultValue={template.name} placeholder="模板名称" required />
      <Input name="sortOrder" type="number" defaultValue={template.sortOrder} placeholder="排序" />
      <Input name="description" defaultValue={template.description ?? ""} placeholder="描述" className="col-span-2" />
      <label className="col-span-2 text-xs font-medium text-muted-foreground">正向提示词</label>
      <textarea
        name="prompt"
        required
        defaultValue={template.prompt}
        className="col-span-2 min-h-40 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <label className="col-span-2 text-xs font-medium text-muted-foreground">负向提示词</label>
      <textarea
        name="negativePrompt"
        defaultValue={template.negativePrompt ?? ""}
        className="col-span-2 min-h-24 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <label className="col-span-2 flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={template.isActive} className="h-4 w-4 rounded border-border" />
        启用模板
      </label>
      {error ? <div className="col-span-2 text-sm text-red-600">{error}</div> : null}
      <div className="col-span-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          取消
        </Button>
        <Button disabled={saving}>{saving ? "保存中" : "保存修改"}</Button>
      </div>
    </form>
  );
}
