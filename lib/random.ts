/** Cryptographically secure randomness that works in Node 22 and browsers. */

export type RandomInt = (maxExclusive: number) => number;

/** Uniform integer in [0, maxExclusive) using rejection sampling (no modulo bias). */
export const secureRandomInt: RandomInt = (maxExclusive) => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 256) {
    throw new RangeError("maxExclusive must be an integer in 1..256");
  }
  const limit = 256 - (256 % maxExclusive);
  const buf = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % maxExclusive;
  }
};

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], randomInt: RandomInt = secureRandomInt): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
