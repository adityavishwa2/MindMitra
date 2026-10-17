import { Text } from "@/components/translation";
import { QuestionContent } from "@/components/question-content";
import type { Question } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Heading, Button } from "@/components/ui";
import type { scoreAnswers } from "@/lib/scoring";
export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const u = await requireUser();
  const { sessionId } = await params;
  const s = await db.practiceSession.findFirst({
    where: { id: sessionId, userId: u.id },
    include: {
      paper: { include: { exam: true, source: true } },
      questions: { orderBy: { position: "asc" }, include: { question: true } },
      answers: true,
    },
  });
  if (!s) notFound();
  if (!s.submittedAt) redirect(`/practice/${s.id}`);
  const r = s.result as ReturnType<typeof scoreAnswers>;
  return (
    <>
      <Heading
        eyebrow="EVERY ATTEMPT IS A STEP FORWARD"
        title="A little more learned."
        description={`${s.paper.exam.name} · ${s.paper.year} · ${s.paper.shift}`}
      />
      <div className="metrics">
        {[
          ["Adjusted score", r.score],
          ["Accuracy", r.accuracy === null ? "—" : `${r.accuracy}%`],
          ["Correct / Incorrect", `${r.correct} / ${r.incorrect}`],
          ["Unattempted / Unscored", `${r.unattempted} / ${r.unscored}`],
        ].map(([k, v]) => (
          <div key={k} className="card metric">
            <small>{k}</small>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="row">
        <Button href="/dashboard">
          <Text value="Back to your dashboard" />
        </Button>
        <Button href="/progress" secondary>
          <Text value="See your progress →" />
        </Button>
      </div>
      <div className="grid-3 section-gap">
        <div className="card">
          <small>Raw score before penalties</small>
          <h3>{r.rawScore}</h3>
        </div>
        <div className="card">
          <small>Recorded focused time</small>
          <h3>
            {Math.floor(s.elapsed / 60)}m {s.elapsed % 60}s
          </h3>
        </div>
        <div className="card">
          <small>Average focused seconds per question</small>
          <h3>
            {s.questions.length
              ? Math.round(s.elapsed / s.questions.length)
              : 0}
            s
          </h3>
        </div>
      </div>
      <section className="card section-gap">
        <h3>Subject-wise results</h3>
        {Object.entries(r.subjects).map(([name, stats]) => (
          <p key={name}>
            {name}: {stats.correct} / {stats.attempted} scorable attempts
            correct ({Math.round((stats.correct / stats.attempted) * 100)}%)
          </p>
        ))}
      </section>
      <h2 className="section-gap" style={{ fontSize: 25 }}>
        <Text value="Let’s learn from this." />
      </h2>
      {s.paper.source.permission !== "AUTHORIZED" ? (
        <p className="notice">
          Question review is unavailable while source rights are under review.
          Your recorded score is retained.
        </p>
      ) : (
        s.questions.map((sq, i) => {
          const q = sq.snapshot as Pick<
              Question,
              | "id"
              | "number"
              | "text"
              | "type"
              | "options"
              | "subject"
              | "sourcePage"
              | "explanation"
            > & { keyReference?: string },
            a = s.answers.find((a) => a.questionId === q.id);
          return (
            <details key={q.id} className="card" style={{ marginBottom: 12 }}>
              <summary>
                {i + 1}. {q.subject} ·{" "}
                {sq.keyStatus !== "VERIFIED"
                  ? "Unscored"
                  : a?.selected == null
                    ? "Unattempted"
                    : a.selected === sq.answer
                      ? "Correct"
                      : "Needs another look"}
              </summary>
              <p style={{ whiteSpace: "pre-wrap", color: "var(--ink)" }}>
                <QuestionContent text={q.text} />
              </p>
              <ol type="A">
                {q.options.map((o, i) => (
                  <li
                    key={i}
                    style={{
                      color:
                        i === sq.answer && sq.keyStatus === "VERIFIED"
                          ? "#16866a"
                          : undefined,
                    }}
                  >
                    {o}
                    {i === a?.selected ? " ← Your answer" : ""}
                  </li>
                ))}
              </ol>
              {q.type === "DESCRIPTIVE" && (
                <p>
                  <Text value="Your response:" />
                  {a?.text ?? "No response saved"}
                  <Text value=". Self-assessment required." />
                </p>
              )}
              <p>
                <Text value="Key status:" />
                {sq.keyStatus}
                <Text value="· version" />
                {sq.keyVersion ?? "—"}.{" "}
                {sq.keyStatus === "VERIFIED" && sq.answer !== null
                  ? `Answer: ${String.fromCharCode(65 + sq.answer)}`
                  : "Excluded from automatic scoring."}
              </p>
              <p>
                Official answer-key reference:{" "}
                {q.keyReference ?? "See source document"}
              </p>
              {q.explanation && (
                <p>
                  <Text value="Reviewed editorial explanation:" />
                  {q.explanation}
                </p>
              )}
              <a
                className="text-link"
                href={s.paper.source.url}
                target="_blank"
                rel="noreferrer"
              >
                <Text value="Source · page" />
                {q.sourcePage} ↗
              </a>
            </details>
          );
        })
      )}
    </>
  );
}
