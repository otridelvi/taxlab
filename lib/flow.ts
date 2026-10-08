import { FLOW_A, TIME_UP_STEP, type Step } from "@/content/flow";
import type { Factors } from "./cell";
import type { ItemSpec } from "./items";
import type { FlowVersion } from "./db/types";

/** Flow helpers (FSD-Participant §4, §6, §7). Pure functions over content/flow.ts. */

export const FIRST_STEP_ID = "welcome";
export const FINISH_STEP_ID = "finish";
export const TIME_UP_STEP_ID = TIME_UP_STEP.id;

export function getFlow(version: FlowVersion | null | undefined): readonly Step[] {
  // Alur B is added once the researcher chooses (PERTANYAAN A1); until then A is used.
  void version;
  return FLOW_A;
}

export function getStep(flow: readonly Step[], id: string | null | undefined): Step | undefined {
  if (id === TIME_UP_STEP.id) return TIME_UP_STEP;
  return flow.find((s) => s.id === id);
}

function indexOfTimer(flow: readonly Step[], mark: "start" | "end"): number {
  return flow.findIndex((s) => s.timer === mark);
}

/** The step that follows `fromId`, or null at the end. After time_up: first step after the timer end. */
export function nextStep(flow: readonly Step[], fromId: string): Step | null {
  if (fromId === TIME_UP_STEP.id) return flow[indexOfTimer(flow, "end") + 1] ?? null;
  const i = flow.findIndex((s) => s.id === fromId);
  if (i < 0) return null;
  return flow[i + 1] ?? null;
}

/** Parameters for advance_step (the SQL function trusts these, so they come from here only). */
export function transition(flow: readonly Step[], fromId: string) {
  const from = getStep(flow, fromId);
  const to = nextStep(flow, fromId);
  if (!from || !to) return null;
  return {
    nextPage: to.id,
    nextRound: to.round ?? null,
    timerStart: to.timer === "start",
    timerEnd: from.timer === "end",
  };
}

/** True for steps inside the timed task part (between the start and end steps, inclusive). */
export function isTaskStep(flow: readonly Step[], id: string): boolean {
  const i = flow.findIndex((s) => s.id === id);
  const start = indexOfTimer(flow, "start");
  const end = indexOfTimer(flow, "end");
  return i >= 0 && start >= 0 && end >= 0 && i >= start && i <= end;
}

export function itemsForStep(step: Step, factors: Factors): ItemSpec[] {
  return step.items ? step.items(factors) : [];
}
