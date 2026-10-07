import { z } from "zod";
import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import { apiError, authorize, readJson } from "@/lib/api";
import { deactivateParticipant } from "@/lib/db/participants";
import { deactivateSchema } from "@/lib/participants";

/** PATCH /api/admin/participants/{id}/deactivate · only while not_started. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/participants/[id]/deactivate">) {
  const admin = await authorize("participants:deactivate");
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);
  const parsed = deactivateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiError(400, "INVALID_INPUT", parsed.error.issues[0]?.message ?? ADMIN_MESSAGES.invalidInput);
  }

  const result = await deactivateParticipant(admin.id, id, parsed.data.reason);
  if (result === "ok") return Response.json({ ok: true });
  if (result === "not_deactivatable")
    return apiError(409, "NOT_DEACTIVATABLE", ADMIN_MESSAGES.notDeactivatable);
  return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);
}
