import { z } from "zod";

/** Event types the browser may send (FSD-Participant §10.2). Server-side types are written in SQL. */
export const CLIENT_EVENT_TYPES = [
  "page_view",
  "tab_hidden",
  "tab_visible",
  "timer_warning",
  "autosave_failed",
  "case_open",
  "case_close",
  "ref_open",
  "ref_close",
  "doc_open",
  "rank_set",
  "save_set",
] as const;

export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export const MAX_EVENTS_PER_REQUEST = 200;

export const clientEventSchema = z.object({
  seq: z.number().int().min(0).max(1_000_000),
  type: z.enum(CLIENT_EVENT_TYPES),
  target: z.string().max(60).nullish(),
  page_id: z.string().max(40).nullish(),
  client_ts: z.iso.datetime({ offset: true }),
  meta: z
    .record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()]))
    .refine((m) => Object.keys(m).length <= 10)
    .nullish(),
});

export type ClientEventInput = z.infer<typeof clientEventSchema>;

/** Keeps the valid events of a batch (invalid ones are dropped, FSD §11). */
export function parseEventBatch(body: unknown): ClientEventInput[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { events?: unknown }).events)) return null;
  const list = (body as { events: unknown[] }).events.slice(0, MAX_EVENTS_PER_REQUEST);
  const valid: ClientEventInput[] = [];
  for (const e of list) {
    const parsed = clientEventSchema.safeParse(e);
    if (parsed.success) valid.push(parsed.data);
  }
  return valid;
}
