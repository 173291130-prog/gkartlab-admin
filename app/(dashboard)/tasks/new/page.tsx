import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { NewTaskForm } from "./task-form";

export default async function NewTaskPage() {
  const user = await requireUser();
  const templates = await prisma.aiTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <Topbar title="新建任务" userName={user.name} />
      <div className="p-8">
        <NewTaskForm templates={templates} />
      </div>
    </>
  );
}
