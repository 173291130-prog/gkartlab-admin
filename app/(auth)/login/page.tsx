import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">AI照片厚涂油画出图系统</h1>
          <p className="mt-2 text-sm text-muted-foreground">客服内部后台</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
