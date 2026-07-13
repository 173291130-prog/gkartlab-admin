"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function UserCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("STAFF");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        password: form.get("password"),
        role,
      }),
    });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        新增账号
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="mb-4 grid grid-cols-3 gap-3 rounded-lg border border-border bg-white p-4">
      <Input name="name" placeholder="姓名" required />
      <Input name="phone" placeholder="手机号" />
      <Input name="email" placeholder="邮箱" />
      <Input name="password" type="password" placeholder="初始密码" required />
      <Select value={role} onValueChange={setRole} options={[{ value: "STAFF", label: "客服" }, { value: "ADMIN", label: "管理员" }]} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
        <Button>保存账号</Button>
      </div>
    </form>
  );
}
