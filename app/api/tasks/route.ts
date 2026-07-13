import { UserRole } from "@prisma/client";
import { fail, ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { taskCreateSchema } from "@/lib/validators/task";

function makeTaskNo() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `AI${stamp}${Math.floor(Math.random() * 90000 + 10000)}`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim();

  const items = await prisma.task.findMany({
    where: {
      ...(user.role === UserRole.STAFF ? { createdById: user.id } : {}),
      ...(keyword
        ? {
            OR: [
              { taskNo: { contains: keyword } },
              { customerName: { contains: keyword } },
              { customerPhone: { contains: keyword } },
              { orderNo: { contains: keyword } },
            ],
          }
        : {}),
    },
    include: { template: true, createdBy: true, images: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok({ items, page: 1, pageSize: 50, total: items.length });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);

  const parsed = taskCreateSchema.safeParse(await request.json());
  if (!parsed.success) return fail("BAD_REQUEST", "任务参数不完整");

  const task = await prisma.task.create({
    data: {
      ...parsed.data,
      taskNo: makeTaskNo(),
      createdById: user.id,
    },
  });

  return ok({ id: task.id, taskNo: task.taskNo });
}
