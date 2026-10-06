import "server-only";
import { isAdminRole, type AdminRole } from "@/lib/auth/roles";
import { serviceClient } from "./service";

export type AdminRecord = {
  id: string;
  name: string;
  role: AdminRole;
  active: boolean;
};

export async function getAdminById(id: string): Promise<AdminRecord | null> {
  const { data, error } = await serviceClient()
    .from("admins")
    .select("id, name, role, active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load admin: ${error.message}`);
  if (!data || !isAdminRole(data.role)) return null;
  return { id: data.id, name: data.name, role: data.role, active: data.active };
}
