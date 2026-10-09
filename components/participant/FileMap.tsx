import { FILE_MAP, REF_LABELS } from "@/content/text";
import type { RefKey } from "./RefMenu";
import s from "./p.module.css";

const ORDER = ["facts", "minutes", "memo"] as const satisfies readonly RefKey[];

/**
 * Flow B (B-10): the files of the assignment with how far the participant is. Desktop only
 * (hidden on phones by CSS). Derived from the current page; nothing is stored or clickable.
 */
export function FileMap({ current }: { current: (typeof ORDER)[number] }) {
  const at = ORDER.indexOf(current);
  return (
    <nav className={s.fmap} aria-label={FILE_MAP.label}>
      <div className={s.kick}>{FILE_MAP.label}</div>
      <ol>
        {ORDER.map((key, i) => {
          const state = i < at ? "done" : i === at ? "now" : "todo";
          return (
            <li key={key} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <b>{REF_LABELS[key]}</b>
              <span>{FILE_MAP.states[state]}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
