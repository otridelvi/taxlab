import { getParticipantSettings } from "@/lib/db/participant-flow";
import { remainingMs, requireActiveSession } from "@/lib/participant-api";

/** GET /api/p/state · current page and timer (FSD §11). */
export async function GET() {
  const session = await requireActiveSession();
  if (session instanceof Response) return session;
  const settings = await getParticipantSettings();
  const left = remainingMs(session.participant);
  return Response.json({
    page: session.step.id,
    remaining_ms: left,
    warning: left !== null && left <= settings.timerWarningMinutes * 60_000,
  });
}
