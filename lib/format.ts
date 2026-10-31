/** Display formats of the admin panel (FSD-Admin §5.5). Pure. */

export const EMPTY = "—";

/** Seconds → mm:ss, or h:mm:ss from one hour. */
export function durationText(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return EMPTY;
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** 1250000 → "Rp1.250.000". */
export function rupiah(n: number | null | undefined): string {
  if (n === null || n === undefined) return EMPTY;
  const abs = String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "−" : ""}Rp${abs}`;
}

/** Difference of money: "+Rp50.000", "−Rp50.000", "=" when equal. */
export function rupiahDelta(n: number | null | undefined): string {
  if (n === null || n === undefined) return EMPTY;
  if (n === 0) return "=";
  return n > 0 ? `+${rupiah(n)}` : rupiah(n);
}

/** Arrow + number, never colour only: ▲ 4, ▼ 4, "=". Positive = moved up / increased. */
export function arrowDelta(n: number | null | undefined): string {
  if (n === null || n === undefined) return EMPTY;
  if (n === 0) return "=";
  return `${n > 0 ? "▲" : "▼"} ${Math.abs(n)}`;
}

/** Rank shift as the researcher reads it: rank 1 → 5 is "▼ 4" (lower in the list). */
export function rankShift(r1: number | null, r2: number | null): string {
  return r1 === null || r2 === null ? EMPTY : arrowDelta(r1 - r2);
}

/** "6 Okt 2026, 14:05" in WIB. */
export function dateTimeWib(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const parts = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).formatToParts(d);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("day")} ${p("month")} ${p("year")}, ${p("hour")}:${p("minute")}`;
}
