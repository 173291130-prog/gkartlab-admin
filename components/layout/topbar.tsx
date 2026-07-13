import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar({ title, userName }: { title: string; userName: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/90 px-8 backdrop-blur">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <form action="/api/auth/logout" method="post">
          <Button variant="ghost" className="px-3" title="退出登录">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
