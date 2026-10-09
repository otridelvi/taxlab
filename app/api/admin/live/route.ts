import { authorize } from "@/lib/api";
import { listLive } from "@/lib/db/admin-ops";
import { closeStaleSessions } from "@/lib/db/participant-flow";

/** GET /api/admin/live : participants in progress with position, time left, last activity (§10). */
export async function GET() {
  const admin = await authorize("dashboard:view");
  if (admin instanceof Response) return admin;
  await closeStaleSessions();
  const rows = await listLive();
  return Response.json({ updatedAt: new Date().toISOString(), rows }, { headers: { "Cache-Control": "no-store" } });
}
