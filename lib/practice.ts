import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { scoreAnswers } from "@/lib/scoring";
export async function submitPractice(userId: string, id: string) {
  return db.$transaction(
    async (tx) => {
      const s = await tx.practiceSession.findFirst({
        where: { id, userId },
        include: {
          paper: true,
          questions: { include: { question: true } },
          answers: true,
        },
      });
      if (!s) throw new Error("NOT_FOUND");
      if (s.submittedAt) return s.result;
      const answers = new Map(s.answers.map((a) => [a.questionId, a.selected]));
      const result = scoreAnswers(
        s.questions.map((q) => ({
          questionId: q.questionId,
          answer: q.answer,
          keyStatus: q.keyStatus,
          selected: answers.get(q.questionId) ?? null,
          subject: q.question.subject,
        })),
        s.paper.marks,
        s.paper.penalty,
      );
      await tx.practiceSession.update({
        where: { id },
        data: {
          submittedAt: new Date(),
          result: result as Prisma.InputJsonValue,
        },
      });
      return result;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function createPractice(
  userId: string,
  paperId: string,
  mode: string,
  filter: {
    subject?: string;
    topic?: string;
    selection?: "all" | "incorrect" | "bookmarked" | "unsolved";
    limit?: number;
  } = {},
) {
  return db.$transaction(async (tx) => {
    const p = await tx.paper.findFirst({
      where: {
        id: paperId,
        status: "PUBLISHED",
        source: { permission: "AUTHORIZED" },
      },
      include: {
        questions: {
          where: { verified: true },
          orderBy: { number: "asc" },
          include: { keys: { orderBy: { version: "desc" }, take: 1 } },
        },
      },
    });
    if (!p || !p.questions.length)
      throw new Error("Paper is not available for practice");
    let selected = p.questions.filter(
      (q) =>
        (!filter.subject || q.subject === filter.subject) &&
        (!filter.topic || q.topic === filter.topic),
    );
    if (mode !== "timed" && filter.selection && filter.selection !== "all") {
      if (filter.selection === "bookmarked") {
        const marks = await tx.bookmark.findMany({
          where: { userId },
          select: { questionId: true },
        });
        const ids = new Set(marks.map((m) => m.questionId));
        selected = selected.filter((q) => ids.has(q.id));
      } else {
        const old = await tx.studentAnswer.findMany({
          where: {
            session: { userId, submittedAt: { not: null } },
            question: { paperId },
          },
          include: { session: { include: { questions: true } } },
        });
        const ids = new Set(
          old
            .filter((a) =>
              filter.selection === "unsolved"
                ? a.selected !== null || !!a.text
                : a.selected !== null &&
                  a.session.questions.some(
                    (q) =>
                      q.questionId === a.questionId &&
                      q.keyStatus === "VERIFIED" &&
                      q.answer !== null &&
                      q.answer !== a.selected,
                  ),
            )
            .map((a) => a.questionId),
        );
        selected = selected.filter((q) =>
          filter.selection === "unsolved" ? !ids.has(q.id) : ids.has(q.id),
        );
      }
    }
    if (mode === "timed") selected = p.questions;
    else if (filter.limit) selected = selected.slice(0, filter.limit);
    if (!selected.length)
      throw new Error("No published questions match these filters");
    return tx.practiceSession.create({
      data: {
        userId,
        paperId,
        mode,
        questions: {
          create: selected.map((q, i) => ({
            questionId: q.id,
            snapshot: {
              id: q.id,
              number: q.number,
              text: q.text,
              type: q.type,
              options: q.options,
              subject: q.subject,
              topic: q.topic,
              sourcePage: q.sourcePage,
              explanation: q.explanation,
              keyReference: q.keys[0]?.reference ?? "",
            },
            position: i,
            keyVersion: q.keys[0]?.version,
            answer: q.keys[0]?.answer,
            keyStatus: q.keys[0]?.status ?? "UNAVAILABLE",
          })),
        },
      },
    });
  });
}
