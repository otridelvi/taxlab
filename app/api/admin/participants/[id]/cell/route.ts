import { z } from "zod";
import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import { apiError, authorize, readJson } from "@/lib/api";
import { changeParticipantCell } from "@/lib/db/participants";
import { changeCellSchema } from "@/lib/participants";

/** PATCH /api/admin/participants/{id}/cell · only while not_started (R-1). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/participants/[id]/cell">) {
  const admin = await authorize("participants:change-cell");
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);
  const parsed = changeCellSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiError(400, "INVALID_INPUT", parsed.error.issues[0]?.message ?? ADMIN_MESSAGES.invalidInput);
  }

  const result = await changeParticipantCell(admin.id, id, parsed.data.cell, parsed.data.reason);
  switch (result) {
    case "ok":
      return Response.json({ ok: true });
    case "locked":
      return apiError(409, "CELL_LOCKED", ADMIN_MESSAGES.cellLocked);
    case "same_cell":
      return apiError(400, "SAME_CELL", ADMIN_MESSAGES.sameCell);
    default:
      return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);
  }
}
