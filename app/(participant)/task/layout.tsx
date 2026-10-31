import { cookies } from "next/headers";
import { EventTracker } from "@/components/participant/EventTracker";
import { serverEnv } from "@/lib/env";
import { PARTICIPANT_COOKIE, verifyParticipantToken } from "@/lib/participant-session";

/** Keeps the event queue mounted while steps change (router.refresh re-renders only the page). */
export default async function TaskLayout({ children }: LayoutProps<"/task">) {
  const token = await verifyParticipantToken(
    (await cookies()).get(PARTICIPANT_COOKIE)?.value,
    serverEnv().SESSION_SECRET,
  );
  return (
    <>
      {token && <EventTracker sessionId={token.sessionId} />}
      {children}
    </>
  );
}
