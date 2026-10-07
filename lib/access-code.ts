import { secureRandomInt, type RandomInt } from "./random";

/** 31 characters: no 0/O, 1/I/L (FSD-Admin §7.1). */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ACCESS_CODE_PATTERN = /^TX-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

/** A new random access code, e.g. "TX-7KQ2-M9PA". Contains no cell information. */
export function generateAccessCode(randomInt: RandomInt = secureRandomInt): string {
  let body = "";
  for (let i = 0; i < 8; i++) body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `TX-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** `count` distinct codes. */
export function generateAccessCodes(count: number, randomInt: RandomInt = secureRandomInt): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateAccessCode(randomInt));
  return [...codes];
}

/**
 * Normalises what a participant types: upper case, spaces removed, dashes
 * inserted. Returns null when it cannot be a valid code.
 */
export function normalizeAccessCode(input: string): string | null {
  let raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (raw.startsWith("TX")) raw = raw.slice(2);
  if (raw.length !== 8) return null;
  const code = `TX-${raw.slice(0, 4)}-${raw.slice(4)}`;
  return ACCESS_CODE_PATTERN.test(code) ? code : null;
}

/** Search helper: "7kq2 m9" → "7KQ2M9" (dashes and spaces ignored). */
export function codeSearchKey(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}
