import { FILE_MAP, REF_LABELS } from "@/content/text";
import type { RefKey } from "./RefMenu";
import s from "./p.module.css";

const ORDER = ["facts", "minutes", "memo"] as const satisfies readonly RefKey[];
const MARK = { done: "\u2713", now: "\u2022", todo: "" } as const;

/**
 * Flow B (B-10): the files of the assignment with how far the participant is, as a bar above
 * the page (mockup XD05). Desktop and tablet only (hidden on phones by CSS). Derived from the
 * current page; nothing is stored or clickable.
 */
export function FileMap({ current }: { current: (typeof ORDER)[number] }) {
  const at = ORDER.indexOf(current);
  return (
    <nav className={s.fmap} aria-label={FILE_MAP.ariaLabel}>
      <span className={s.fmapLabel}>{FILE_MAP.label}</span>
      <ol>
        {ORDER.map((key, i) => {
          const state = i < at ? "done" : i === at ? "now" : "todo";
          return (
            <li key={key} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <span className={s.fmapMark} aria-hidden="true">
                {MARK[state]}
              </span>
              {REF_LABELS[key]}
              <em>{FILE_MAP.states[state]}</em>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
