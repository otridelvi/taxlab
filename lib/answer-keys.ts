import type { Factors } from "@/lib/cell";
import keys from "@/content/answer-keys.json";

/**
 * Answer keys of the manipulation checks (PLAN-06 §3). Server and export only: never import this
 * file from a client component (the keys would reach the browser). Not marked `server-only`
 * so unit tests can load it.
 */
export type McKey = { mc_q1: 1 | 2; mc_q2: 1 | 2; mc_q3: number };

/** Option number that counts as passing each manipulation check in this cell. */
export function mcKey(f: Factors): McKey {
  return {
    mc_q1: f.pref === "expl" ? keys.mc_q1.expl : keys.mc_q1.impl,
    mc_q2: f.acc === "weak" ? keys.mc_q2.weak : keys.mc_q2.strong,
    mc_q3: keys.mc_q3,
  } as McKey;
}

/** Knowledge-question key (cov_q1…cov_q5); null until the researcher supplies it (C1). */
export const COV_KEY: Record<string, number> | null = keys.cov;
