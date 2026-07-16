import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { fail, ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);
  if (user.role !== UserRole.ADMIN) return fail("FORBIDDEN", "无权限", 403);

  const items = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, email: true, role: true, status: true, createdAt: true },
  });
  return ok(items);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);
  if (user.role !== UserRole.ADMIN) return fail("FORBIDDEN", "无权限", 403);

  const body = await request.json();
  const account = String(body.account ?? body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!account || password.length < 6) {
    return fail("BAD_REQUEST", "账号和至少 6 位密码必填");
  }

  try {
    const created = await prisma.user.create({
      data: {
        name: String(body.name ?? account),
        phone: body.phone ? String(body.phone) : null,
        email: account,
        role: body.role === "ADMIN" ? "ADMIN" : "STAFF",
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: { id: true, name: true, phone: true, email: true, role: true, status: true, createdAt: true },
    });

    return ok(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("DUPLICATE_ACCOUNT", "这个账号已经存在");
    }
    throw error;
  }
}
