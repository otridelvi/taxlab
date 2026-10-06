import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/session";
import { createAuthClient } from "@/lib/supabase/server";
import { getAdminById } from "@/lib/db/admins";
import type { AdminRole } from "./roles";

export type CurrentAdmin = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  loginAt: number;
};

/**
 * The logged-in admin for this request, or null.
 * Requires: a valid Supabase Auth user, a valid (≤12h) session marker for the
 * same user, and an active row in `admins`.
 */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    serverEnv().SESSION_SECRET,
  );
  if (!session || session.sub !== user.id) return null;

  const admin = await getAdminById(user.id);
  if (!admin || !admin.active) return null;

  return {
    id: admin.id,
    name: admin.name,
    email: user.email ?? "",
    role: admin.role,
    loginAt: session.loginAt,
  };
});

/** For admin pages: returns the admin or redirects to the login page. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
