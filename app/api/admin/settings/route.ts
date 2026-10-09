import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import { apiError, authorize, readJson } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getTarget, setTarget } from "@/lib/db/admin-ops";
import { parseTarget } from "@/lib/live";

/** PATCH /api/admin/settings { targetPerCell } : completed participants wanted per cell (1–500). */
export async function PATCH(request: Request) {
  const admin = await authorize("settings:edit");
  if (admin instanceof Response) return admin;

  const body = (await readJson(request)) as { targetPerCell?: unknown } | null;
  const target = parseTarget(body?.targetPerCell);
  if (target === null) return apiError(400, "INVALID_TARGET", ADMIN_MESSAGES.invalidTarget);

  const previous = await getTarget();
  await setTarget(admin.id, target);
  await writeAudit({ adminId: admin.id, action: "update_target", detail: { from: previous, to: target } });
  return Response.json({ ok: true, targetPerCell: target });
}
