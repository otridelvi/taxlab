"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { isLockedOut, normalizeEmail } from "@/lib/auth/rate-limit";
import { safeNextPath } from "@/lib/auth/redirect";
import { getAdminById } from "@/lib/db/admins";
import { countRecentFailedLogins, recordLoginAttempt } from "@/lib/db/login-attempts";
import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signAdminSession } from "@/lib/session";
import { createAuthClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(200),
  next: z.string().max(500).optional(),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email: normalizeEmail(rawEmail),
    password: String(formData.get("password") ?? ""),
    next: formData.get("next") ? String(formData.get("next")) : undefined,
  });
  if (!parsed.success) return { error: AUTH_MESSAGES.invalidInput, email: rawEmail };

  const { email, password, next } = parsed.data;
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = requestHeaders.get("user-agent") ?? null;

  let redirectTo: string | null = null;
  try {
    if (isLockedOut(await countRecentFailedLogins(email))) {
      return { error: AUTH_MESSAGES.rateLimited, email };
    }

    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      await recordLoginAttempt(email, false, ip);
      if (error?.status === 429) return { error: AUTH_MESSAGES.rateLimited, email };
      return { error: AUTH_MESSAGES.invalidCredentials, email };
    }

    const admin = await getAdminById(data.user.id);
    if (!admin || !admin.active) {
      await supabase.auth.signOut();
      await recordLoginAttempt(email, false, ip);
      return { error: AUTH_MESSAGES.notAdmin, email };
    }

    await recordLoginAttempt(email, true, ip);

    const token = await signAdminSession({ sub: admin.id, loginAt: Date.now() }, serverEnv().SESSION_SECRET);
    (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    await writeAudit({ adminId: admin.id, action: "login", detail: { ip, user_agent: userAgent } });
    redirectTo = safeNextPath(next);
  } catch (err) {
    console.error("[admin login]", err);
    return { error: AUTH_MESSAGES.unexpected, email };
  }

  // redirect() throws, so it must stay outside the try/catch above.
  if (redirectTo) redirect(redirectTo);
  return {};
}
