import type { Question } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Heading } from "@/components/ui";
import { Quiz } from "@/components/quiz";
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
      questions: {
        orderBy: { position: "asc" },
        include: {
          question: {
            select: {
              id: true,
              number: true,
              text: true,
              type: true,
              options: true,
              subject: true,
              sourcePage: true,
            },
          },
        },
      },
      answers: true,
    },
  });
  if (!s) notFound();
  if (s.paper.source.permission !== "AUTHORIZED")
    return (
      <Heading
        eyebrow="SOURCE REVIEW"
        title="This paper is temporarily unavailable."
        description="Your saved progress is retained while the source authorization is reviewed."
      />
    );
  if (s.submittedAt) redirect(`/practice/${s.id}/results`);
  const bookmarks = await db.bookmark.findMany({
    where: {
      userId: u.id,
      questionId: { in: s.questions.map((q) => q.questionId) },
    },
    select: { questionId: true },
  });
  return (
    <>
      <Heading
        eyebrow={s.paper.exam.name}
        title={s.paper.title}
        description={`${s.paper.year} · ${s.paper.stage} · ${s.paper.shift}`}
      />
      <Quiz
        key={s.id}
        id={s.id}
        questions={s.questions.map((q) => {
          const v = q.snapshot as Pick<
            Question,
            | "id"
            | "number"
            | "text"
            | "type"
            | "options"
            | "subject"
            | "sourcePage"
          >;
          return {
            id: v.id,
            number: v.number,
            text: v.text,
            type: v.type,
            options: v.options,
            subject: v.subject,
            sourcePage: v.sourcePage,
          };
        })}
        initialCurrent={s.current}
        mode={s.mode}
        startedAt={s.startedAt.toISOString()}
        durationMinutes={s.paper.durationMinutes}
        initialElapsed={s.elapsed}
        initialBookmarks={bookmarks.map((b) => b.questionId)}
        initialAnswers={Object.fromEntries(
          s.answers.map((a) => [
            a.questionId,
            { selected: a.selected, reviewed: a.reviewed, text: a.text ?? "" },
          ]),
        )}
      />
    </>
  );
}
