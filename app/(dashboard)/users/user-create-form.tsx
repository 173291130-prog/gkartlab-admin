"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UserCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: form.get("account"),
        password: form.get("password"),
      }),
    });
    const data = await response.json();

    setLoading(false);
    if (!data.success) {
      setError(data.error?.message ?? "创建失败");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        新增客服账号
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-lg border border-border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input name="account" placeholder="客服账号" required />
        <Input name="password" type="password" placeholder="初始密码，至少 6 位" required />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button disabled={loading}>{loading ? "保存中" : "保存账号"}</Button>
        </div>
      </div>
      {error ? <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
    </form>
  );
}
