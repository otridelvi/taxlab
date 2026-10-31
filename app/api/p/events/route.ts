import { getStep } from "@/lib/flow";
import { P_MESSAGES } from "@/lib/participant-messages";
import { parseEventBatch } from "@/lib/participant-events";
import { pError, readBody, readParticipantSession } from "@/lib/participant-api";
import { insertEvents } from "@/lib/db/participant-flow";

/** POST /api/p/events · batched browser events, also via navigator.sendBeacon (FSD §10). */
export async function POST(request: Request) {
  const session = await readParticipantSession();
  if (session.kind === "replaced") return pError(409, "SESSION_REPLACED", P_MESSAGES.sessionReplaced);
  if (session.kind !== "active") return pError(401, "UNAUTHENTICATED", P_MESSAGES.unauthenticated);

  const events = parseEventBatch(await readBody(request));
  if (!events) return pError(400, "INVALID_INPUT", P_MESSAGES.invalidItem);

  const accepted = await insertEvents(
    session.participant.id,
    session.token.sessionId,
    events.map((e) => ({
      seq: e.seq,
      type: e.type,
      target: e.target ?? null,
      page_id: e.page_id ?? null,
      // The round comes from the page, never from the browser.
      round: getStep(session.flow, e.page_id)?.round ?? null,
      client_ts: e.client_ts,
      duration_ms: e.duration_ms ?? null,
      meta: e.meta ?? null,
    })),
  );
  return Response.json({ accepted });
}
