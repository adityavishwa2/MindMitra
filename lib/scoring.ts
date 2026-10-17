export type Scorable = {
  questionId: string;
  answer: number | null;
  keyStatus: string;
  selected: number | null;
  subject: string;
};
export function scoreAnswers(rows: Scorable[], marks: number, penalty: number) {
  let correct = 0,
    incorrect = 0,
    unattempted = 0,
    unscored = 0;
  const subjects: Record<string, { correct: number; attempted: number }> = {};
  for (const r of rows) {
    if (r.keyStatus !== "VERIFIED" || r.answer === null) {
      unscored++;
      continue;
    }
    if (r.selected === null) {
      unattempted++;
      continue;
    }
    const s = (subjects[r.subject] ??= { correct: 0, attempted: 0 });
    s.attempted++;
    if (r.answer === r.selected) {
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
