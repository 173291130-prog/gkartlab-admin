import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { platformLabel } from "@/config/platforms";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await prisma.task.findMany({
    where: user.role === UserRole.STAFF ? { createdById: user.id } : {},
    include: { template: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <Topbar title="任务历史" userName={user.name} />
      <div className="p-8">
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">任务编号</th>
                  <th className="px-5 py-3">客户</th>
                  <th className="px-5 py-3">订单号</th>
                  <th className="px-5 py-3">平台</th>
                  <th className="px-5 py-3">模板</th>
                  <th className="px-5 py-3">尺寸</th>
                  <th className="px-5 py-3">客服</th>
                  <th className="px-5 py-3">状态</th>
                  <th className="px-5 py-3">创建时间</th>
                  <th className="px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{task.taskNo}</td>
                    <td className="px-5 py-3">{task.customerName || "-"}</td>
                    <td className="px-5 py-3">{task.orderNo || "-"}</td>
                    <td className="px-5 py-3">{platformLabel(task.platform)}</td>
                    <td className="px-5 py-3">{task.template?.name || "-"}</td>
                    <td className="px-5 py-3">{task.sizeMode === "CUSTOM" ? `${task.customWidth}x${task.customHeight}` : task.sizePreset}</td>
                    <td className="px-5 py-3">{task.createdBy.name}</td>
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
