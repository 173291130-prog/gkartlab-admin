import { requireAdmin } from "@/lib/auth/session";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";
import { UserCreateForm } from "./user-create-form";

export default async function UsersPage() {
  const user = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <Topbar title="账号管理" userName={user.name} />
      <div className="p-8">
        <div className="mb-4 flex justify-end">
          <UserCreateForm />
        </div>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">名称</th>
                  <th className="px-5 py-3">账号</th>
                  <th className="px-5 py-3">角色</th>
                  <th className="px-5 py-3">状态</th>
                  <th className="px-5 py-3">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{item.name}</td>
                    <td className="px-5 py-3">{item.email || "-"}</td>
                    <td className="px-5 py-3">{item.role === "ADMIN" ? "管理员" : "客服"}</td>
                    <td className="px-5 py-3">{item.status === "ACTIVE" ? "启用" : "禁用"}</td>
                    <td className="px-5 py-3">{formatDate(item.createdAt)}</td>
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
