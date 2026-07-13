"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TemplateCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        prompt: form.get("prompt"),
        negativePrompt: form.get("negativePrompt"),
        sortOrder: form.get("sortOrder"),
        isActive: true,
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
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        新增模板
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-white p-4">
      <Input name="name" placeholder="模板名称" required />
      <Input name="sortOrder" type="number" placeholder="排序" />
      <Input name="description" placeholder="描述" className="col-span-2" />
      <textarea
        name="prompt"
        required
        placeholder="正向提示词 prompt"
        className="col-span-2 min-h-24 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        name="negativePrompt"
        placeholder="负向提示词 negativePrompt"
        className="col-span-2 min-h-20 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {error ? <div className="col-span-2 text-sm text-red-600">{error}</div> : null}
      <div className="col-span-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          取消
        </Button>
        <Button disabled={saving}>{saving ? "保存中" : "保存模板"}</Button>
      </div>
    </form>
  );
}
