import { cookies } from "next/headers";
import { z } from "zod";
import { normalizeAccessCode } from "@/lib/access-code";
import { serverEnv } from "@/lib/env";
import { FIRST_STEP_ID } from "@/lib/flow";
import { P_MESSAGES } from "@/lib/participant-messages";
import { clientIp, contentVersion, pError, readBody, setParticipantCookies } from "@/lib/participant-api";
import { isCodeRateLimited, codeAttemptWindowStart } from "@/lib/participant-rate-limit";
import {
  CONSENT_COOKIE,
  DEVICE_COOKIE,
  DEVICE_ID_PATTERN,
  signParticipantToken,
  verifyConsent,
} from "@/lib/participant-session";
import {
  countRecentCodeFailures,
  getParticipantSettings,
  participantLogin,
  recordCodeAttempt,
} from "@/lib/db/participant-flow";

const schema = z.object({ code: z.string().max(40) });

/** POST /api/p/login · start or resume with an access code (FSD §5.2). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await readBody(request));
  const code = parsed.success ? normalizeAccessCode(parsed.data.code) : null;
  if (!code) return pError(400, "INVALID_FORMAT", P_MESSAGES.invalidFormat);

  const env = serverEnv();
  const store = await cookies();
  const rawDevice = store.get(DEVICE_COOKIE)?.value;
  const deviceId = rawDevice && DEVICE_ID_PATTERN.test(rawDevice) ? rawDevice : crypto.randomUUID();
  const newDevice = deviceId !== rawDevice;
  const ip = clientIp(request);

  const failures = await countRecentCodeFailures(deviceId, ip, codeAttemptWindowStart());
  if (isCodeRateLimited(failures)) {
    if (newDevice) await setParticipantCookies({ device: deviceId });
    return pError(429, "RATE_LIMITED", P_MESSAGES.rateLimited);
  }

  const consentAt = await verifyConsent(store.get(CONSENT_COOKIE)?.value, env.SESSION_SECRET);
  const settings = await getParticipantSettings();
  const sessionId = crypto.randomUUID();
  const login = await participantLogin({
    code,
    sessionId,
    consentAt,
    flowVersion: settings.flowVersion,
    contentVersion: contentVersion(),
    firstPage: FIRST_STEP_ID,
  });

  await recordCodeAttempt(deviceId, ip, login.result !== "not_found");
  if (newDevice) await setParticipantCookies({ device: deviceId });

  switch (login.result) {
    case "started":
    case "resumed": {
      const token = await signParticipantToken(
        { participantId: login.participantId!, sessionId },
        env.SESSION_SECRET,
      );
      await setParticipantCookies({ participant: token, consent: null });
      return Response.json({ page: login.page, resumed: login.result === "resumed" });
    }
    case "not_found":
      return pError(404, "CODE_NOT_FOUND", P_MESSAGES.codeNotFound);
    case "cancelled":
      return pError(403, "CODE_CANCELLED", P_MESSAGES.codeCancelled);
    case "completed":
      return pError(409, "CODE_COMPLETED", P_MESSAGES.codeCompleted);
    case "closed":
      return pError(409, "CODE_CLOSED", P_MESSAGES.codeClosed);
    case "consent_required":
      return pError(428, "CONSENT_REQUIRED", P_MESSAGES.consentRequired);
  }
}
