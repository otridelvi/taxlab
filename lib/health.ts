import { timingSafeEqual } from "node:crypto";

/**
 * Checks `Authorization: Bearer <token>` against the configured HEALTHCHECK_TOKEN.
 * Returns false when no token is configured, so an unset variable never opens the endpoint.
 */
export function isValidHealthToken(header: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !header) return false;
  const match = /^Bearer (.+)$/.exec(header.trim());
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
