import { ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Login page renders without the shell
  if (pathname === "/login") return <>{children}</>;

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-card px-2 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="ml-3 text-xs text-muted-foreground">
              ADO International Transport Nepal · Logistics OS
            </div>
            <div className="ml-auto flex items-center gap-3 pr-2">
              {user && (
                <>
                  <div className="text-xs text-right leading-tight hidden sm:block">
                    <div className="font-medium text-foreground">
                      {profile?.name || user.email}
                    </div>
                    <div className="text-muted-foreground capitalize">
                      {role ?? "no role"}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" /> Logout
                  </Button>
                </>
              )}
            </div>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
