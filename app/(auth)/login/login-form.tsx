"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [account, setAccount] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!data.success) {
      setError(data.error?.message ?? "登录失败");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">账号</label>
        <Input value={account} onChange={(event) => setAccount(event.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">密码</label>
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <Button className="w-full" disabled={loading}>
        {loading ? "登录中" : "登录"}
      </Button>
    </form>
  );
}
