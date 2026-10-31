import { z } from "zod";
import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import { apiError, authorize, readJson } from "@/lib/api";
import { deleteContacts } from "@/lib/db/admin-ops";

const bodySchema = z.object({
  confirm: z.string(),
  batchId: z.uuid().nullable().optional(),
});

/**
 * DELETE /api/admin/contacts { confirm: "HAPUS", batchId? } : removes incentive contacts
 * (one batch, or all when batchId is empty). Research data is not touched. Audited.
 */
export async function DELETE(request: Request) {
  const admin = await authorize("contacts:delete");
  if (admin instanceof Response) return admin;

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "INVALID_INPUT", ADMIN_MESSAGES.invalidInput);
  if (parsed.data.confirm !== "HAPUS") return apiError(400, "NOT_CONFIRMED", ADMIN_MESSAGES.confirmDelete);

  const deleted = await deleteContacts(admin.id, parsed.data.batchId ?? null);
  return Response.json({ ok: true, deleted });
}
