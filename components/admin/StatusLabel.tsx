import type { ParticipantStatus } from "@/lib/db/types";
import { STATUS_LABELS } from "@/lib/participants";
import styles from "./ui.module.css";

const DOT: Record<ParticipantStatus, React.CSSProperties> = {
  not_started: { background: "#fff", boxShadow: "inset 0 0 0 1.5px var(--color-ink-faint)" },
  in_progress: { background: "var(--color-accent)" },
  completed: { background: "var(--color-success)" },
  timed_out: { background: "var(--color-warning)" },
  cancelled: { background: "var(--color-ink-faint)" },
};

/** Status is always shown as dot + text (FSD-Admin §5.2). */
export function StatusLabel({ status }: { status: ParticipantStatus }) {
  return (
    <span className={styles.status}>
      <i className={styles.dot} style={DOT[status]} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
