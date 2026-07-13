import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div>
      <Sidebar role={user.role} />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}
