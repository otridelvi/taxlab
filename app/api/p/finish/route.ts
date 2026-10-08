import { FINISH_STEP_ID } from "@/lib/flow";
import { P_MESSAGES } from "@/lib/participant-messages";
import { pError, requireActiveSession, setParticipantCookies } from "@/lib/participant-api";
import { finishSession } from "@/lib/db/participant-flow";

/** POST /api/p/finish · "Survey Selesai" (FSD N-6). Ends the session and removes the cookie. */
export async function POST() {
  const session = await requireActiveSession();
  if (session instanceof Response) return session;
  const result = await finishSession(session.participant.id, session.token.sessionId, FINISH_STEP_ID);
  if (result === "not_at_finish") return pError(409, "NOT_AT_FINISH", P_MESSAGES.notAtFinish);
  if (result === "session_replaced") return pError(409, "SESSION_REPLACED", P_MESSAGES.sessionReplaced);
  if (result !== "ok") return pError(409, "NOT_ACTIVE", P_MESSAGES.unauthenticated);
  await setParticipantCookies({ participant: null });
  return Response.json({ ok: true });
}
