import { cookies } from "next/headers";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { P_MESSAGES } from "@/lib/participant-messages";
import { pError, readBody, setParticipantCookies } from "@/lib/participant-api";
import { DEVICE_COOKIE, DEVICE_ID_PATTERN, signConsent } from "@/lib/participant-session";

const schema = z.object({ agree: z.literal(true) });

/** POST /api/p/consent · records consent in a short-lived signed cookie (FSD §5.1). */
export async function POST(request: Request) {
  if (!schema.safeParse(await readBody(request)).success) {
    return pError(400, "CONSENT_REQUIRED", P_MESSAGES.consentRequired);
  }
  const store = await cookies();
  const device = store.get(DEVICE_COOKIE)?.value;
  await setParticipantCookies({
    consent: await signConsent(new Date(), serverEnv().SESSION_SECRET),
    device: device && DEVICE_ID_PATTERN.test(device) ? undefined : crypto.randomUUID(),
  });
  return Response.json({ ok: true });
}
