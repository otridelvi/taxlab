/**
 * Experimental factors per cell (PRD 0.2 §3, debriefing text):
 *   Sel 1 = Implisit / Reviu spesifik       Sel 2 = Eksplisit / Reviu spesifik
 *   Sel 3 = Implisit / Reviu tidak spesifik Sel 4 = Eksplisit / Reviu tidak spesifik
 * Only used on the server; the cell itself never reaches the browser.
 */
export type Preference = "impl" | "expl";
/** yes = the supervisor review is specific, no = it is not specific. */
export type Review = "yes" | "no";
export type Factors = { pref: Preference; review: Review };

export function cellFactors(cell: number): Factors {
  if (![1, 2, 3, 4].includes(cell)) throw new Error(`Invalid cell: ${cell}`);
  return {
    pref: cell % 2 === 1 ? "impl" : "expl",
    review: cell <= 2 ? "yes" : "no",
  };
}
