export type Scorable = {
  questionId: string;
  type?: string;
  answer: number | null;
  correctAnswers?: number[];
  keyStatus: string;
  selected: number | null;
  selectedOptions?: number[];
  subject: string;
};
export function choiceIndexes(
  type: string | undefined,
  single: number | null | undefined,
  multiple: number[] = [],
) {
  return type === "MSQ" ? multiple : single == null ? [] : [single];
}
export function gradeAnswer(
  r: Scorable,
): "CORRECT" | "INCORRECT" | "UNATTEMPTED" | "UNSCORED" {
  const keys = choiceIndexes(r.type, r.answer, r.correctAnswers);
  const selected = choiceIndexes(r.type, r.selected, r.selectedOptions);
  if (r.type === "DESCRIPTIVE" || r.keyStatus !== "VERIFIED" || keys.length < 1)
    return "UNSCORED";
  if (!selected.length) return "UNATTEMPTED";
  return selected.length === keys.length &&
    new Set(selected).size === selected.length &&
    selected.every((i) => keys.includes(i))
    ? "CORRECT"
    : "INCORRECT";
}
export function scoreAnswers(rows: Scorable[], marks: number, penalty: number) {
  let correct = 0,
    incorrect = 0,
    unattempted = 0,
    unscored = 0;
  const subjects: Record<string, { correct: number; attempted: number }> = {};
  for (const r of rows) {
    const result = gradeAnswer(r);
    if (result === "UNSCORED") {
      unscored++;
      continue;
    }
    if (result === "UNATTEMPTED") {
      unattempted++;
      continue;
    }
    const s = (subjects[r.subject] ??= { correct: 0, attempted: 0 });
    s.attempted++;
    if (result === "CORRECT") {
      correct++;
      s.correct++;
    } else incorrect++;
  }
  return {
    correct,
    incorrect,
    unattempted,
    unscored,
    rawScore: correct * marks,
    score: Number((correct * marks - incorrect * penalty).toFixed(4)),
    accuracy:
      correct + incorrect
        ? Math.round((correct / (correct + incorrect)) * 100)
        : null,
    subjects,
  };
}
export function paperComplete(ids: string[], attempted: Set<string>) {
  return ids.length > 0 && ids.every((id) => attempted.has(id));
}
