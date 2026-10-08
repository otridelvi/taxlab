import { z } from "zod";
import { itemsForStep } from "@/lib/flow";
import { splitItems } from "@/lib/items";
import { P_MESSAGES } from "@/lib/participant-messages";
import { pError, readBody, remainingMs, requireActiveSession } from "@/lib/participant-api";
import { saveResponses } from "@/lib/db/participant-flow";

const schema = z.object({
  page: z.string().max(40),
  items: z.record(z.string().max(40), z.unknown()).refine((o) => Object.keys(o).length <= 60),
});

/** PATCH /api/p/responses · autosave for the current page only (FSD §8.2). */
export async function PATCH(request: Request) {
  const session = await requireActiveSession();
  if (session instanceof Response) return session;
  const parsed = schema.safeParse(await readBody(request));
  if (!parsed.success) return pError(422, "INVALID_ITEM", P_MESSAGES.invalidItem);
  if (parsed.data.page !== session.step.id) return pError(409, "STALE_PAGE", P_MESSAGES.stalePage);

  const split = splitItems(itemsForStep(session.step, session.factors), parsed.data.items, "draft");
  if (split.invalid.length)
    return pError(422, "INVALID_ITEM", P_MESSAGES.invalidItem, { keys: split.invalid });

  const result = await saveResponses({
    participantId: session.participant.id,
    sessionId: session.token.sessionId,
    page: session.step.id,
    items: split.responses,
    contact: split.contact,
  });
  if (result === "session_replaced") return pError(409, "SESSION_REPLACED", P_MESSAGES.sessionReplaced);
  if (result === "stale_page") return pError(409, "STALE_PAGE", P_MESSAGES.stalePage);
  if (result !== "ok") return pError(409, "NOT_ACTIVE", P_MESSAGES.unauthenticated);
  return Response.json({
    saved: Object.keys(split.responses).length + Object.keys(split.contact).length,
    remaining_ms: remainingMs(session.participant),
  });
}
