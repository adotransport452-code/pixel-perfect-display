import { supabase } from "@/integrations/supabase/client";
import type { Permissions, Role } from "@/contexts/AuthContext";

async function callAdmin<T = any>(action: string, body: Record<string, any> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, ...body } });
  if (error) throw new Error(error.message);
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

export const adminExists = () => callAdmin<{ exists: boolean }>("admin-exists");
export const bootstrapFirstAdmin = ({ data }: { data: { name: string; email: string; password: string } }) =>
  callAdmin("bootstrap-admin", data);
export const listUsers = () => callAdmin<any[]>("list-users");
export const createUser = ({ data }: { data: { name: string; email: string; password: string; role: Role; permissions: Permissions } }) =>
  callAdmin("create-user", data);
export const updateUser = ({ data }: { data: { userId: string; name: string; role: Role; permissions: Permissions; disabled: boolean; password?: string } }) =>
  callAdmin("update-user", data);
export const deleteUser = ({ data }: { data: { userId: string } }) => callAdmin("delete-user", data);
