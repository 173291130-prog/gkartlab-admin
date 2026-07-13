export const TASK_STATUS_META: Record<string, { label: string; className: string }> = {
  WAITING_SUBMIT: { label: "等待提交", className: "bg-slate-100 text-slate-700" },
  SUBMITTED: { label: "提交成功", className: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "AI处理中", className: "bg-amber-100 text-amber-700" },
  SUCCEEDED: { label: "生成成功", className: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "生成失败", className: "bg-red-100 text-red-700" },
};
