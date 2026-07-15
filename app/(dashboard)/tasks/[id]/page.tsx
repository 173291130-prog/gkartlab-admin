import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { UserRole } from "@prisma/client";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { platformLabel } from "@/config/platforms";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";
import { TaskActions } from "./task-actions";
import { TaskProgress } from "./task-progress";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, ...(user.role === UserRole.STAFF ? { createdById: user.id } : {}) },
    include: {
      template: true,
      createdBy: true,
      images: { orderBy: { createdAt: "desc" } },
      generations: { include: { template: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!task) notFound();

  const original = task.images.find((image) => image.type === "ORIGINAL");
  const generated = task.images.find((image) => image.type === "GENERATED");
  const latestGeneration = task.generations[0];
  const canRegenerate = Boolean(
    original?.filePath && (/^https?:\/\//i.test(original.filePath) || process.env.AI_PUBLIC_BASE_URL),
  );

  return (
    <>
      <Topbar title="任务详情" userName={user.name} />
      <div className="space-y-6 p-8">
        <Card>
          <CardContent className="grid grid-cols-4 gap-4 text-sm">
            <Info label="任务编号" value={task.taskNo} />
            <Info label="当前状态" value={<StatusBadge status={task.status} />} />
            <Info label="客户姓名" value={task.customerName || "-"} />
            <Info label="联系电话" value={task.customerPhone || "-"} />
            <Info label="订单号" value={task.orderNo || "-"} />
            <Info
              label="顾客要的尺寸"
              value={task.requestedWidth && task.requestedHeight ? `${task.requestedWidth}x${task.requestedHeight}` : "-"}
            />
            <Info label="平台来源" value={platformLabel(task.platform)} />
            <Info label="客服" value={task.createdBy.name} />
            <Info label="创建时间" value={formatDate(task.createdAt)} />
            <Info label="模板" value={task.template?.name || "-"} />
            <Info label="AI尺寸" value={task.sizeMode === "CUSTOM" ? `${task.customWidth}x${task.customHeight}` : task.sizePreset || "-"} />
          </CardContent>
        </Card>

        <TaskProgress taskId={task.id} initialStatus={task.status} latestError={latestGeneration?.errorMessage} />

        <div className="grid grid-cols-2 gap-6">
          <ImagePanel title="原图" src={original?.filePath} width={original?.width} height={original?.height} emptyText="暂无原图" />
          <ImagePanel title="生成图" src={generated?.filePath} width={generated?.width} height={generated?.height} emptyText="暂无生成结果" />
        </div>

        <div className="flex gap-3">
          <TaskActions taskId={task.id} canRegenerate={canRegenerate} hasGenerated={Boolean(generated)} />
          {generated ? (
            <Button asChild variant="outline">
              <Link href={generated.filePath} download>
                <Download className="h-4 w-4" />
                下载生成图
              </Link>
            </Button>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">生成记录</h2>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">时间</th>
                  <th className="px-5 py-3">模板</th>
                  <th className="px-5 py-3">状态</th>
                  <th className="px-5 py-3">外部任务 ID</th>
                  <th className="px-5 py-3">失败原因</th>
                </tr>
              </thead>
              <tbody>
                {task.generations.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-5 py-3">{item.template?.name || "-"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3">{item.externalJobId || "-"}</td>
                    <td className="px-5 py-3">{item.errorMessage || "-"}</td>
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

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function ImagePanel({
  title,
  src,
  width,
  height,
  emptyText,
}: {
  title: string;
  src?: string;
  width?: number | null;
  height?: number | null;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{title}</h2>
          {width && height ? <span className="text-xs text-muted-foreground">{formatImageMeta(width, height)}</span> : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={title} className="max-h-full max-w-full rounded-md object-contain" />
          ) : (
            <span className="text-sm text-muted-foreground">{emptyText}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatImageMeta(width: number, height: number) {
  const divisor = gcd(width, height);
  return `${width} x ${height} · ${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}
