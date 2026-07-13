import { UserRole } from "@prisma/client";
import { fail, ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);
  if (user.role !== UserRole.ADMIN) return fail("FORBIDDEN", "无权限", 403);

  const { id } = await params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const prompt = String(body.prompt ?? "").trim();

  if (!name) return fail("BAD_REQUEST", "模板名称不能为空");
  if (!prompt) return fail("BAD_REQUEST", "正向提示词不能为空");

  const template = await prisma.aiTemplate.update({
    where: { id },
    data: {
      name,
      description: body.description ? String(body.description) : null,
      prompt,
      negativePrompt: body.negativePrompt ? String(body.negativePrompt) : null,
      sortOrder: Number(body.sortOrder ?? 0),
      isActive: Boolean(body.isActive),
    },
  });

  return ok(template);
}
