import Link from "next/link";
import { UserRole } from "@prisma/client";
import { LayoutDashboard, History, ImagePlus, Settings, Users, BarChart3, PawPrint, Palette } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "统一工作台", icon: LayoutDashboard },
  { href: "/pet-content", label: "宠物耗材获客", icon: PawPrint },
  { href: "/tasks/new", label: "肌理画新建任务", icon: ImagePlus },
  { href: "/tasks", label: "肌理画任务历史", icon: History },
  { href: "/templates", label: "模板管理", icon: Settings, admin: true },
  { href: "/settings", label: "系统设置", icon: Settings, admin: true },
  { href: "/users", label: "账号管理", icon: Users, admin: true },
  { href: "/admin", label: "后台管理", icon: BarChart3, admin: true },
];

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-white">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-2 text-base font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#174d3b] text-xs text-white">广</span>广开艺造</div>
        <div className="ml-10 mt-0.5 text-xs text-muted-foreground">AI 工作台</div>
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
