import "server-only";
import type { Json } from "@/lib/db/types";
import { serviceClient } from "@/lib/db/service";

/** Audit actions (FSD-Admin §9). */
export type AuditAction =
  | "login"
  | "generate"
  | "change_cell"
  | "deactivate"
  | "reset_session"
  | "update_target"
  | "export_dataset"
  | "export_events"
  | "export_contacts"
  | "delete_contacts";

export async function writeAudit(entry: {
  adminId: string;
  action: AuditAction;
  participantId?: string | null;
  detail?: Record<string, Json | undefined>;
}): Promise<void> {
  const { error } = await serviceClient()
    .from("audit_logs")
    .insert({
      admin_id: entry.adminId,
      action: entry.action,
      participant_id: entry.participantId ?? null,
      detail: (entry.detail ?? {}) as Json,
    });
  if (error) throw new Error(`Failed to write audit log: ${error.message}`);
}
