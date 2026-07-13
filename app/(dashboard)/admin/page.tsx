import { requireAdmin } from "@/lib/auth/session";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";

export default async function AdminPage() {
  const user = await requireAdmin();
  const [staffCount, taskCount, generationCount, successCount] = await Promise.all([
    prisma.user.count({ where: { role: "STAFF" } }),
    prisma.task.count(),
    prisma.aiGeneration.count(),
    prisma.task.count({ where: { status: "SUCCEEDED" } }),
  ]);

  return (
    <>
      <Topbar title="后台管理" userName={user.name} />
      <div className="grid grid-cols-4 gap-4 p-8">
        {[
          ["客服账号", staffCount],
          ["任务总数", taskCount],
          ["生成次数", generationCount],
          ["成功任务", successCount],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="mt-3 text-3xl font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
