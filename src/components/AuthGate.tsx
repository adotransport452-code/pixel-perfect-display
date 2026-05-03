import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, type Permissions } from "@/contexts/AuthContext";

// Map legacy grouped permission keys to the new per-section keys.
// A user is granted access if they have EITHER the legacy flag OR any of the
// per-section flags it expanded into. This keeps the gate aligned with the
// actual sections shown in the sidebar.
const PERM_ALIASES: Partial<Record<keyof Permissions, (keyof Permissions)[]>> = {
  settings: ["stations", "clients", "delivery_receipts"],
  tracking: ["shipments", "overall_details", "tracking_system"],
  reports: ["consignments"],
  billing: ["payments"],
};

function hasAccess(permissions: Permissions, key: keyof Permissions): boolean {
  if (permissions[key]) return true;
  const aliases = PERM_ALIASES[key];
  if (aliases && aliases.some((k) => permissions[k])) return true;
  return false;
}

export function AuthGate({ children, require }: { children: ReactNode; require?: keyof Permissions; }) {
  const { loading, user, role, permissions, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
  }, [loading, user, navigate, location.pathname]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return null;
  if (profile?.disabled) return (
    <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center">
      <h1 className="text-2xl font-bold">Account disabled</h1>
      <p className="mt-2 text-muted-foreground">Contact your administrator to restore access.</p>
    </div></div>
  );
  if (require && role !== "admin" && !permissions[require]) return (
    <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center">
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="mt-2 text-muted-foreground">You do not have permission to view this section.</p>
    </div></div>
  );
  return <>{children}</>;
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const { loading, user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
  }, [loading, user, navigate, location.pathname]);
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return null;
  if (role !== "admin") return (
    <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center">
      <h1 className="text-2xl font-bold">Admins only</h1>
      <p className="mt-2 text-muted-foreground">This area is restricted to administrators.</p>
    </div></div>
  );
  return <>{children}</>;
}
