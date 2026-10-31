import { z } from "zod";
import { itemsForStep, transition, validateStep } from "@/lib/flow";
import { hasProblems, problemsMessage, splitItems } from "@/lib/items";
import { P_MESSAGES } from "@/lib/participant-messages";
import { pError, readBody, remainingMs, requireActiveSession } from "@/lib/participant-api";
import { advanceStep, getOpenedDocs, getParticipantSettings } from "@/lib/db/participant-flow";

const schema = z.object({
  from: z.string().max(40),
  items: z.record(z.string().max(40), z.unknown()).optional(),
  reason: z.enum(["next", "timer_expired"]).optional(),
});

/** POST /api/p/advance · save the page and move to the next step (FSD §7.2). */
export async function POST(request: Request) {
  const session = await requireActiveSession();
  if (session instanceof Response) return session;
  const parsed = schema.safeParse(await readBody(request));
  if (!parsed.success) return pError(422, "INVALID_ITEM", P_MESSAGES.invalidItem);
  const { from, items = {}, reason = "next" } = parsed.data;

  // requireActiveSession already applied the timeout; a stale "from" (e.g. the timer
  // request after time_up was reached) just tells the browser to reload.
  if (from !== session.step.id) {
    return pError(409, "STALE_PAGE", P_MESSAGES.stalePage, { page: session.step.id });
  }
  if (reason === "timer_expired") {
    // The deadline has not passed by the server clock: nothing to do.
    return Response.json({ page: session.step.id, remaining_ms: remainingMs(session.participant) });
  }

  // Flow B: a closed document must be opened first (PLAN-05 D-3).
  if (session.step.gate && !(await getOpenedDocs(session.participant.id)).includes(session.step.gate)) {
    return pError(422, "DOC_NOT_OPENED", P_MESSAGES.docNotOpened);
  }

  const specs = itemsForStep(session.step, session.factors);
  const split = splitItems(specs, items, "draft");
  if (split.invalid.length)
    return pError(422, "INVALID_ITEM", P_MESSAGES.invalidItem, { keys: split.invalid });
  const problems = validateStep(session.step, session.factors, items);
  if (hasProblems(problems)) {
    return pError(422, "INCOMPLETE", problemsMessage(specs, problems) || "Isian belum lengkap.", {
      missing: problems.missing,
      duplicate: problems.duplicate,
    });
  }
  const final = splitItems(specs, items, "final");

  const move = transition(session.flow, session.step.id);
  if (!move) return pError(409, "NO_NEXT_STEP", P_MESSAGES.stalePage);
  const settings = await getParticipantSettings();

  const result = await advanceStep({
    participantId: session.participant.id,
    sessionId: session.token.sessionId,
    from: session.step.id,
    items: final.responses,
    contact: final.contact,
    reason: "next",
    ...move,
    timerMinutes: settings.timerMinutes,
  });

  if (result === "session_replaced") return pError(409, "SESSION_REPLACED", P_MESSAGES.sessionReplaced);
  // Time ran out between the check and the write: reloading /task shows the time_up step.
  if (result === "stale_page" || result === "expired") {
    return pError(409, "STALE_PAGE", P_MESSAGES.stalePage);
  }
  if (result !== "ok") return pError(409, "NOT_ACTIVE", P_MESSAGES.unauthenticated);
  return Response.json({ page: move.nextPage });
}
