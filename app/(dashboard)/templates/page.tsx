import { requireAdmin } from "@/lib/auth/session";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";
import { TemplateCreateForm } from "./template-create-form";
import { TemplateEditForm } from "./template-edit-form";

export default async function TemplatesPage() {
  const user = await requireAdmin();
  const templates = await prisma.aiTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });

  return (
    <>
      <Topbar title="模板管理" userName={user.name} />
      <div className="space-y-4 p-8">
        <div className="flex justify-end">
          <TemplateCreateForm />
        </div>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {templates.map((item) => (
              <div key={item.id} className="space-y-4 p-5">
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold">{item.name}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        排序 {item.sortOrder}
                      </span>
                      {item.isDefault ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">默认</span> : null}
                      <span className={item.isActive ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700" : "rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"}>
                        {item.isActive ? "启用" : "停用"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.description || "暂无描述"}</div>
                    <div className="mt-3 line-clamp-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">正向提示词：</span>
                      {item.prompt}
                    </div>
                    {item.negativePrompt ? (
                      <div className="mt-1 line-clamp-1 text-sm text-slate-500">
                        <span className="font-medium text-slate-700">负向提示词：</span>
                        {item.negativePrompt}
                      </div>
                    ) : null}
                    <div className="mt-2 text-xs text-muted-foreground">创建时间：{formatDate(item.createdAt)}</div>
                  </div>
                  <div className="flex items-start">
                    <TemplateEditForm template={item} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
