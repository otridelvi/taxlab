import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import type { Cell } from "@/lib/allocate";
import { apiError, authorize, readJson } from "@/lib/api";
import { createBatch } from "@/lib/db/participants";
import { createBatchSchema } from "@/lib/participants";

/** POST /api/admin/batches · generate access codes (FSD-Admin §6.4). */
export async function POST(request: Request) {
  const admin = await authorize("participants:generate");
  if (admin instanceof Response) return admin;

  const parsed = createBatchSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiError(400, "INVALID_INPUT", parsed.error.issues[0]?.message ?? ADMIN_MESSAGES.invalidInput);
  }
  const { quantity, label, mode, cell } = parsed.data;

  try {
    const batch = await createBatch({
      adminId: admin.id,
      quantity,
      label,
      mode,
      cell: mode === "manual" ? (cell as Cell) : null,
    });
    return Response.json(
      { batch_id: batch.batchId, label: batch.label, codes: batch.codes, allocation: batch.allocation },
      { status: 201 },
    );
  } catch (err) {
    console.error("[generate]", err);
    return apiError(500, "GENERATE_FAILED", ADMIN_MESSAGES.generateFailed);
  }
}
