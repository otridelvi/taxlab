import "server-only";
import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import { getCurrentAdmin, type CurrentAdmin } from "@/lib/auth/current-admin";
import { can, type Permission } from "@/lib/auth/roles";

/** Error body for /api/admin (FSD-Admin §10): { error: { code, message } }. */
export function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

/** Checks session + permission. Returns the admin, or a 401/403 response. */
export async function authorize(permission: Permission): Promise<CurrentAdmin | Response> {
  const admin = await getCurrentAdmin();
  if (!admin) return apiError(401, "UNAUTHENTICATED", ADMIN_MESSAGES.unauthenticated);
  if (!can(admin.role, permission)) return apiError(403, "FORBIDDEN", ADMIN_MESSAGES.forbidden);
  return admin;
}

/** Parses a JSON body; returns null when it is not valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
