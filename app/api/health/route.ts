import { serverEnv } from "@/lib/env";
import { serviceClient } from "@/lib/db/service";
import { isValidHealthToken } from "@/lib/health";

/**
 * GET /api/health · keep-alive for the free-tier database (PLAN-08).
 * Needs `Authorization: Bearer <HEALTHCHECK_TOKEN>`. Runs one light query so Supabase sees activity.
 * Called every 5 days by .github/workflows/keep-alive.yml. Never returns data from the database.
 */
export async function GET(request: Request) {
  const env = serverEnv();
  if (!isValidHealthToken(request.headers.get("authorization"), env.HEALTHCHECK_TOKEN)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const { error } = await serviceClient().from("settings").select("key").limit(1);
  if (error) {
    console.error("[health]", error.message);
    return Response.json({ ok: false, env: env.APP_ENV }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ ok: true, env: env.APP_ENV }, { headers: { "Cache-Control": "no-store" } });
}
