import "server-only";
import { db } from "./db";
import { paperComplete, gradeAnswer } from "./scoring";
export async function analytics(userId: string) {
  const sessions = await db.practiceSession.findMany({
    where: { userId, submittedAt: { not: null } },
    include: {
      paper: { include: { exam: true } },
      questions: true,
      answers: { include: { question: true } },
    },
    orderBy: { startedAt: "asc" },
  });
  const unique = new Set<string>();
  let correct = 0,
    attempts = 0,
    seconds = 0;
  const daily: Record<
    string,
    { date: string; questions: number; correct: number }
  > = {};
  const subjects: Record<
    string,
    { subject: string; correct: number; attempted: number }
  > = {};
  for (const s of sessions) {
    seconds += s.elapsed;
    const date = s.startedAt.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const day = (daily[date] ??= { date, questions: 0, correct: 0 });
    for (const a of s.answers) {
      if (a.selected === null && !a.selectedOptions.length && !a.text) continue;
      unique.add(a.questionId);
      attempts++;
      day.questions++;
      const q = s.questions.find((q) => q.questionId === a.questionId);
      if (!q) continue;
      const snapshot = q.snapshot as { type?: string; subject?: string };
      const result = gradeAnswer({
        questionId: a.questionId,
        type: snapshot.type,
        answer: q.answer,
        correctAnswers: q.correctAnswers,
        keyStatus: q.keyStatus,
        selected: a.selected,
        selectedOptions: a.selectedOptions,
        subject: snapshot.subject ?? a.question.subject,
      });
      if (result === "CORRECT" || result === "INCORRECT") {
        const sub = (subjects[snapshot.subject ?? a.question.subject] ??= {
          subject: snapshot.subject ?? a.question.subject,
          correct: 0,
          attempted: 0,
        });
        sub.attempted++;
        if (result === "CORRECT") {
          correct++;
          day.correct++;
          sub.correct++;
        }
      }
    }
  }
  const papers = await db.paper.findMany({
    where: { status: "PUBLISHED", source: { permission: "AUTHORIZED" } },
    include: {
      exam: true,
      questions: { where: { verified: true }, select: { id: true } },
    },
  });
  const complete = papers.filter((p) =>
    paperComplete(
      p.questions.map((q) => q.id),
      unique,
    ),
  );
  const byYear = new Map<
    string,
    {
      exam: string;
      year: number;
      total: number;
      attempted: number;
      papers: number;
      completed: number;
    }
  >();
  for (const p of papers) {
    const key = `${p.examId}-${p.year}`;
    const r = byYear.get(key) ?? {
      exam: p.exam.name,
      year: p.year,
      total: 0,
      attempted: 0,
      papers: 0,
      completed: 0,
    };
    r.total += p.questions.length;
    r.attempted += p.questions.filter((q) => unique.has(q.id)).length;
    r.papers++;
    if (complete.some((c) => c.id === p.id)) r.completed++;
    byYear.set(key, r);
  }
  const days = Object.keys(daily).sort();
  let longest = 0,
    run = 0;
  let last = 0;
  for (const d of days) {
    const n = new Date(d + "T00:00:00Z").getTime();
    run = n - last === 86400000 ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = n;
  }
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString(
    "en-CA",
    { timeZone: "Asia/Kolkata" },
  );
  const streak = days.at(-1) === today || days.at(-1) === yesterday ? run : 0;
  const scored = Object.values(subjects).reduce((n, s) => n + s.attempted, 0);
  return {
    sessions,
    unique: unique.size,
    correct,
    attempts,
    seconds,
    accuracy: scored ? Math.round((correct / scored) * 100) : null,
    daily: Object.values(daily),
    subjects: Object.values(subjects),
    completedPapers: complete.length,
    years: Array.from(byYear.values()),
    streak,
    longest,
  };
}
