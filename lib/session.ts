import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session marker.
 *
 * Supabase Auth keeps its own (refreshable) session cookies. This extra,
 * signed cookie records when the admin logged in, so the app can enforce a
 * hard 12-hour session limit (PRD L-04) regardless of token refreshes.
 */
export const ADMIN_SESSION_COOKIE = "tx_admin_session";
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export type AdminSessionPayload = {
  /** Admin user id (Supabase Auth user id). */
  sub: string;
  /** Login time in milliseconds since epoch. */
  loginAt: number;
};

function encodeKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAdminSession(payload: AdminSessionPayload, secret: string): Promise<string> {
  const issuedAt = Math.floor(payload.loginAt / 1000);
  return new SignJWT({ loginAt: payload.loginAt })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .sign(encodeKey(secret));
}

/** Returns the payload, or null when the token is missing, tampered with or expired. */
export async function verifyAdminSession(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodeKey(secret), {
      algorithms: ["HS256"],
      currentDate: now,
    });
    if (typeof payload.sub !== "string" || typeof payload.loginAt !== "number") return null;
    return { sub: payload.sub, loginAt: payload.loginAt };
  } catch {
    return null;
  }
}
