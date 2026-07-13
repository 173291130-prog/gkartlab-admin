import Link from "next/link";
import { UserRole } from "@prisma/client";
import { LayoutDashboard, History, ImagePlus, Settings, Users, BarChart3 } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/tasks/new", label: "新建任务", icon: ImagePlus },
  { href: "/tasks", label: "任务历史", icon: History },
  { href: "/templates", label: "模板管理", icon: Settings, admin: true },
  { href: "/users", label: "账号管理", icon: Users, admin: true },
  { href: "/admin", label: "后台管理", icon: BarChart3, admin: true },
];

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-white">
      <div className="border-b border-border px-5 py-5">
        <div className="text-base font-semibold">AI油画出图系统</div>
        <div className="mt-1 text-xs text-muted-foreground">客服后台 V1</div>
      </div>
      <nav className="space-y-1 p-3">
        {nav
          .filter((item) => !item.admin || role === UserRole.ADMIN)
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-muted"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
