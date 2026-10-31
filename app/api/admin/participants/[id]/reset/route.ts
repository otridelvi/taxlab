import { z } from "zod";
import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import { apiError, authorize, readJson } from "@/lib/api";
import { getParticipantCode, resetSession } from "@/lib/db/admin-ops";
import { resetSchema } from "@/lib/participants";

/**
 * POST /api/admin/participants/{id}/reset { reason, confirmCode } · technical resets only (D6).
 * Archives responses + events, returns the participant to not_started. Completed sessions: 409.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/participants/[id]/reset">) {
  const admin = await authorize("participants:reset");
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);
  const parsed = resetSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiError(400, "INVALID_INPUT", parsed.error.issues[0]?.message ?? ADMIN_MESSAGES.invalidInput);
  }

  const code = await getParticipantCode(id);
  if (!code) return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);
  if (parsed.data.confirmCode !== code) return apiError(400, "CODE_MISMATCH", ADMIN_MESSAGES.codeMismatch);

  const result = await resetSession(admin.id, id, parsed.data.reason);
  if (result === "ok") return Response.json({ ok: true });
  if (result === "not_resettable") return apiError(409, "NOT_RESETTABLE", ADMIN_MESSAGES.notResettable);
  return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);
}
