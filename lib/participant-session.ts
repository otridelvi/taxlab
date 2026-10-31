import { SignJWT, jwtVerify } from "jose";

/**
 * Participant cookies (FSD-Participant §5, §15).
 * - tx_p: signed { participant id, session id }, 12 h. Proves which session this browser holds.
 * - tx_consent: signed consent time, 2 h, set on "/" before login.
 * - tx_device: random id, 1 year, only for the login rate limit.
 */
export const PARTICIPANT_COOKIE = "tx_p";
export const CONSENT_COOKIE = "tx_consent";
export const DEVICE_COOKIE = "tx_device";

export const PARTICIPANT_MAX_AGE_SECONDS = 12 * 60 * 60;
export const CONSENT_MAX_AGE_SECONDS = 2 * 60 * 60;
export const DEVICE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const AUD_PARTICIPANT = "participant";
const AUD_CONSENT = "consent";

export type ParticipantToken = { participantId: string; sessionId: string };

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signParticipantToken(
  t: ParticipantToken,
  secret: string,
  now = new Date(),
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({ sid: t.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(t.participantId)
    .setAudience(AUD_PARTICIPANT)
    .setIssuedAt(iat)
    .setExpirationTime(iat + PARTICIPANT_MAX_AGE_SECONDS)
    .sign(key(secret));
}

export async function verifyParticipantToken(
  token: string | undefined,
  secret: string,
  now = new Date(),
): Promise<ParticipantToken | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      algorithms: ["HS256"],
      audience: AUD_PARTICIPANT,
      currentDate: now,
    });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return { participantId: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
}

export async function signConsent(consentAt: Date, secret: string): Promise<string> {
  const iat = Math.floor(consentAt.getTime() / 1000);
  return new SignJWT({ at: consentAt.toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUD_CONSENT)
    .setIssuedAt(iat)
    .setExpirationTime(iat + CONSENT_MAX_AGE_SECONDS)
    .sign(key(secret));
}

/** Consent time, or null when missing/expired/tampered. */
export async function verifyConsent(
  token: string | undefined,
  secret: string,
  now = new Date(),
): Promise<Date | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      algorithms: ["HS256"],
      audience: AUD_CONSENT,
      currentDate: now,
    });
    if (typeof payload.at !== "string") return null;
    const at = new Date(payload.at);
    return Number.isNaN(at.getTime()) ? null : at;
  } catch {
    return null;
  }
}

export const DEVICE_ID_PATTERN = /^[0-9a-f-]{36}$/;
