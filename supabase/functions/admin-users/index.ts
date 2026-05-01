// Admin user management edge function
// Handles: bootstrap-admin, admin-exists, list-users, create-user, update-user, delete-user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type Permissions = {
  dashboard?: boolean; tracking?: boolean; reports?: boolean; billing?: boolean; settings?: boolean;
  stations?: boolean; clients?: boolean; consignments?: boolean; shipments?: boolean;
  payments?: boolean; delivery_receipts?: boolean; overall_details?: boolean; tracking_system?: boolean;
};
type Role = "admin" | "staff" | "client";

const PERM_KEYS = [
  "dashboard", "tracking", "reports", "billing", "settings",
  "stations", "clients", "consignments", "shipments",
  "payments", "delivery_receipts", "overall_details", "tracking_system",
] as const;

function normalizePerms(p: Permissions | undefined, role: Role): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of PERM_KEYS) out[k] = role === "admin" ? true : !!(p as any)?.[k];
  return out;
}

async function setRoleAndPermissions(userId: string, role: Role, perms: Permissions) {
  await admin.from("user_roles").delete().eq("user_id", userId);
  await admin.from("user_roles").insert({ user_id: userId, role });
  const normalized = normalizePerms(perms, role);
  await admin.from("user_permissions").upsert({ user_id: userId, ...normalized }, { onConflict: "user_id" });
}

async function countAdmins() {
  const { count } = await admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await userClient.auth.getUser();
  return data?.user?.id ?? null;
}

async function assertCallerIsAdmin(userId: string | null) {
  if (!userId) throw new Error("Not authenticated");
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admins only");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? (await req.clone().json().catch(() => ({}))).action;
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (action === "admin-exists") {
      const n = await countAdmins();
      return json({ exists: n > 0 });
    }

    if (action === "bootstrap-admin") {
      const n = await countAdmins();
      if (n > 0) throw new Error("Bootstrap not allowed: an admin already exists.");
      const { name, email, password } = body;
      if (!name || !email || !password || password.length < 8) throw new Error("Invalid input");
      const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
      if (error || !created.user) throw new Error(error?.message ?? "Failed to create admin");
      await admin.from("profiles").update({ name }).eq("user_id", created.user.id);
      await setRoleAndPermissions(created.user.id, "admin", { dashboard: true, tracking: true, reports: true, billing: true, settings: true });
      return json({ ok: true });
    }

    const callerId = await getCallerUserId(req);

    if (action === "list-users") {
      await assertCallerIsAdmin(callerId);
      const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
        admin.from("profiles").select("*").order("created_at", { ascending: false }),
        admin.from("user_roles").select("*"),
        admin.from("user_permissions").select("*"),
      ]);
      const rolesByUser = new Map<string, Role>();
      (roles ?? []).forEach((r: any) => rolesByUser.set(r.user_id, r.role));
      const permsByUser = new Map<string, Record<string, boolean>>();
      (perms ?? []).forEach((p: any) => {
        const o: Record<string, boolean> = {};
        for (const k of PERM_KEYS) o[k] = !!p[k];
        permsByUser.set(p.user_id, o);
      });
      const empty = Object.fromEntries(PERM_KEYS.map((k) => [k, false]));
      return json((profiles ?? []).map((p: any) => ({
        ...p,
        role: rolesByUser.get(p.user_id) ?? null,
        permissions: permsByUser.get(p.user_id) ?? empty,
      })));
    }

    if (action === "create-user") {
      await assertCallerIsAdmin(callerId);
      const { name, email, password, role, permissions } = body;
      const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
      if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
      await admin.from("profiles").update({ name }).eq("user_id", created.user.id);
      await setRoleAndPermissions(created.user.id, role, permissions);
      return json({ ok: true, userId: created.user.id });
    }

    if (action === "update-user") {
      await assertCallerIsAdmin(callerId);
      const { userId, name, role, permissions, disabled, password } = body;
      await admin.from("profiles").update({ name, disabled }).eq("user_id", userId);
      await setRoleAndPermissions(userId, role, permissions);
      if (password && password.length >= 8) {
        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error) throw new Error(error.message);
      }
      return json({ ok: true });
    }

    if (action === "delete-user") {
      await assertCallerIsAdmin(callerId);
      const { userId } = body;
      if (userId === callerId) throw new Error("You cannot delete your own account.");
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 400);
  }
});
