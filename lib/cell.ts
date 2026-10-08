/**
 * Experimental factors per cell (PRD 0.2 §3, debriefing text):
 *   Sel 1 = Implisit / Lemah   Sel 2 = Eksplisit / Lemah
 *   Sel 3 = Implisit / Kuat    Sel 4 = Eksplisit / Kuat
 * Only used on the server; the cell itself never reaches the browser.
 */
export type Preference = "impl" | "expl";
export type Accountability = "weak" | "strong";
export type Factors = { pref: Preference; acc: Accountability };

export function cellFactors(cell: number): Factors {
  if (![1, 2, 3, 4].includes(cell)) throw new Error(`Invalid cell: ${cell}`);
  return {
    pref: cell % 2 === 1 ? "impl" : "expl",
    acc: cell <= 2 ? "weak" : "strong",
  };
}
