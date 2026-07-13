import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Plus } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { platformLabel } from "@/config/platforms";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const baseWhere = user.role === UserRole.STAFF ? { createdById: user.id } : {};
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [todayGeneratedCount, totalGeneratedCount, todaySucceededCount, recentTasks] = await Promise.all([
    prisma.task.count({ where: { ...baseWhere, createdAt: { gte: start } } }),
    prisma.task.count({ where: baseWhere }),
    prisma.task.count({ where: { ...baseWhere, createdAt: { gte: start }, status: "SUCCEEDED" } }),
    prisma.task.findMany({
      where: baseWhere,
      include: { template: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const successRate = todayGeneratedCount ? Math.round((todaySucceededCount / todayGeneratedCount) * 100) : 0;

  return (
    <>
      <Topbar title="工作台" userName={user.name} />
      <div className="space-y-6 p-8">
        <div className="flex justify-end">
          <Button asChild>
            <Link href="/tasks/new">
              <Plus className="h-4 w-4" />
              新建任务
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            ["今日生成数量", todayGeneratedCount],
            ["总生成数量", totalGeneratedCount],
            ["今日成功率", `${successRate}%`],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent>
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-3 text-3xl font-semibold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">任务编号</th>
                  <th className="px-5 py-3">客户</th>
                  <th className="px-5 py-3">平台</th>
                  <th className="px-5 py-3">模板</th>
                  <th className="px-5 py-3">状态</th>
                  <th className="px-5 py-3">创建时间</th>
                  <th className="px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => (
                  <tr key={task.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{task.taskNo}</td>
                    <td className="px-5 py-3">{task.customerName || "-"}</td>
                    <td className="px-5 py-3">{platformLabel(task.platform)}</td>
                    <td className="px-5 py-3">{task.template?.name || "-"}</td>
                    <td className="px-5 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-5 py-3">{formatDate(task.createdAt)}</td>
                    <td className="px-5 py-3"><Link className="text-primary" href={`/tasks/${task.id}`}>查看</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
