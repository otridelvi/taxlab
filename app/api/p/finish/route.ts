import { FINISH_STEP_ID } from "@/lib/flow";
import { P_MESSAGES } from "@/lib/participant-messages";
import { pError, requireActiveSession, setParticipantCookies } from "@/lib/participant-api";
import { finishSession } from "@/lib/db/participant-flow";

/** POST /api/p/finish · "Survey Selesai" (FSD N-6). Ends the session and removes the cookie. */
export async function POST() {
  const session = await requireActiveSession();
  if (session instanceof Response) return session;
  // Flow A ends on its own "finish" page; in flow B the debriefing page ends the session (PLAN-05 D-12).
  const finishPage = session.step.ends ? session.step.id : FINISH_STEP_ID;
  const result = await finishSession(session.participant.id, session.token.sessionId, finishPage);
  if (result === "not_at_finish") return pError(409, "NOT_AT_FINISH", P_MESSAGES.notAtFinish);
  if (result === "session_replaced") return pError(409, "SESSION_REPLACED", P_MESSAGES.sessionReplaced);
  if (result !== "ok") return pError(409, "NOT_ACTIVE", P_MESSAGES.unauthenticated);
  await setParticipantCookies({ participant: null });
  return Response.json({ ok: true });
}
