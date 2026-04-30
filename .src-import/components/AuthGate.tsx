import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth, type Permissions } from "@/contexts/AuthContext";

export function AuthGate({
  children,
  require,
}: {
  children: ReactNode;
  require?: keyof Permissions;
}) {
  const { loading, user, role, permissions, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: location.pathname } as any });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  if (profile?.disabled) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Account disabled</h1>
          <p className="mt-2 text-muted-foreground">
            Contact your administrator to restore access.
          </p>
        </div>
      </div>
    );
  }

  if (require && role !== "admin" && !permissions[require]) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to view this section.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const { loading, user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: location.pathname } as any });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return null;
  if (role !== "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-muted-foreground">
            This area is restricted to administrators.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
