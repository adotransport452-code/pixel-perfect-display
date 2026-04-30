import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "staff" | "client";
export type Permissions = {
  dashboard: boolean;
  // legacy grouped flags (still respected)
  tracking: boolean;
  reports: boolean;
  billing: boolean;
  settings: boolean;
  // per-section flags
  stations: boolean;
  clients: boolean;
  consignments: boolean;
  shipments: boolean;
  payments: boolean;
  delivery_receipts: boolean;
  overall_details: boolean;
  tracking_system: boolean;
};
export type Profile = { user_id: string; name: string; email: string; disabled: boolean; };

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  permissions: Permissions;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const defaultPerms: Permissions = {
  dashboard: false, tracking: false, reports: false, billing: false, settings: false,
  stations: false, clients: false, consignments: false, shipments: false,
  payments: false, delivery_receipts: false, overall_details: false, tracking_system: false,
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permissions>(defaultPerms);

  const loadFor = useCallback(async (uid: string | null) => {
    if (!uid) { setProfile(null); setRole(null); setPermissions(defaultPerms); return; }
    const [{ data: prof }, { data: r }, { data: p }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("user_permissions").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile((prof as any) ?? null);
    setRole(((r as any)?.role as Role) ?? null);
    if (p) {
      setPermissions({
        dashboard: !!(p as any).dashboard, tracking: !!(p as any).tracking,
        reports: !!(p as any).reports, billing: !!(p as any).billing, settings: !!(p as any).settings,
        stations: !!(p as any).stations, clients: !!(p as any).clients,
        consignments: !!(p as any).consignments, shipments: !!(p as any).shipments,
        payments: !!(p as any).payments, delivery_receipts: !!(p as any).delivery_receipts,
        overall_details: !!(p as any).overall_details, tracking_system: !!(p as any).tracking_system,
      });
    } else setPermissions(defaultPerms);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess); setUser(sess?.user ?? null);
      setTimeout(() => { loadFor(sess?.user?.id ?? null); }, 0);
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess); setUser(sess?.user ?? null);
      loadFor(sess?.user?.id ?? null).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, [loadFor]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null); setRole(null); setPermissions(defaultPerms);
  }, []);
  const refresh = useCallback(async () => { await loadFor(user?.id ?? null); }, [loadFor, user?.id]);

  return (
    <AuthContext.Provider value={{ loading, session, user, profile, role, permissions, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
