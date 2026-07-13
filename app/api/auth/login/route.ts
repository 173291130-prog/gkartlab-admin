import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { setSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json();
  const account = String(body.account ?? "").trim();
  const password = String(body.password ?? "");

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: account }, { phone: account }],
      status: "ACTIVE",
    },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return fail("INVALID_CREDENTIALS", "账号或密码错误", 401);
  }

  await setSession(user.id);

  return ok({ user: { id: user.id, name: user.name, role: user.role } });
}
