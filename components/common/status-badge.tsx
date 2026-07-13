import { TASK_STATUS_META } from "@/config/task-status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const meta = TASK_STATUS_META[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>;
}
