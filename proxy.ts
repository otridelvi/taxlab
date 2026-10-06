import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { serverEnv } from "@/lib/env";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/session";

/**
 * Runs before every /admin request:
 * 1. Refreshes the Supabase Auth session cookies.
 * 2. Blocks admin pages without a valid login (redirect to /admin/login?next=…).
 * 3. Ends sessions older than 12 hours (redirect with ?reason=expired).
 *
 * This is an optimistic check. Pages still verify the admin row and role
 * on the server (lib/auth/current-admin.ts).
 */
export async function proxy(request: NextRequest) {
  const env = serverEnv();
  const { pathname, search } = request.nextUrl;

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(cacheHeaders ?? {})) response.headers.set(key, value);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/admin/login") return response;

  const marker = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSession(marker, env.SESSION_SECRET);
  if (user && session && session.sub === user.id) return response;

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = "";
  const expired = Boolean(user && marker && !session);
  if (expired) {
    loginUrl.searchParams.set("reason", "expired");
  } else {
    loginUrl.searchParams.set("next", pathname + search);
  }

  const redirect = NextResponse.redirect(loginUrl);
  redirect.cookies.delete(ADMIN_SESSION_COOKIE);
  if (expired) {
    // Fully end the Supabase session too.
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) redirect.cookies.delete(cookie.name);
    }
  }
  return redirect;
}

export const config = {
  matcher: ["/admin/:path*"],
};
