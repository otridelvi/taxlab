"use client";

import { Fields, type FieldsProps } from "./Fields";
import { LikertGrid } from "./LikertGrid";
import s from "./p.module.css";

export type QuestionnairePart = { title: string; intro: string };

/** Flow B questionnaire: part A (multiple choice) and part B (scale) on one page, each with its own title and intro. */
export function QuestionnaireFields({
  parts,
  ...props
}: FieldsProps & { parts: { mcq: QuestionnairePart; likert: QuestionnairePart } }) {
  const mcq = props.items.filter((i) => i.type === "choice");
  const likert = props.items.filter((i) => i.type === "likert");
  return (
    <>
      <h2 className={s.h2}>{parts.mcq.title}</h2>
      <p
        className={s.muted}
        style={{ margin: "0 0 20px" }}
        dangerouslySetInnerHTML={{ __html: parts.mcq.intro }}
      />
      <Fields {...props} items={mcq} />
      <h2 className={s.h2} style={{ marginTop: 32 }}>
        {parts.likert.title}
      </h2>
      <p
        className={s.muted}
        style={{ margin: "0 0 20px" }}
        dangerouslySetInnerHTML={{ __html: parts.likert.intro }}
      />
      <LikertGrid {...props} items={likert} />
    </>
  );
}
