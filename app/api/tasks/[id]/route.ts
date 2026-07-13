import { UserRole } from "@prisma/client";
import { fail, ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);

  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, ...(user.role === UserRole.STAFF ? { createdById: user.id } : {}) },
    include: {
      template: true,
      createdBy: { select: { id: true, name: true, role: true } },
      images: true,
      generations: { include: { template: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!task) return fail("NOT_FOUND", "任务不存在", 404);
  return ok(task);
}
