import { needsCbtText } from "@/lib/cbt";
import { validRequestOrigin, ORIGIN_ERROR } from "@/lib/request-origin";
import { importPaper } from "@/lib/paper-import";
import { toCsv } from "@/lib/csv";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { profileInput, importInput, questionInput } from "@/lib/validation";
import { createPractice, submitPractice } from "@/lib/practice";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ path: string[] }> };
const ok = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { path } = await ctx.params;
  if (path[0] === "report") {
    const sessions = await db.practiceSession.findMany({
      where: { userId: user.id, submittedAt: { not: null } },
      include: { paper: { include: { exam: true } } },
      orderBy: { startedAt: "desc" },
    });
    const rows: (string | number | null)[][] = [
      [
        "Examination",
        "Year",
        "Stage",
        "Shift",
        "Started (UTC)",
        "Focused seconds",
        "Score",
        "Accuracy percent",
      ],
    ];
    for (const s of sessions) {
      const r = s.result as { score: number; accuracy: number | null } | null;
      rows.push([
        s.paper.exam.name,
        s.paper.year,
        s.paper.stage,
        s.paper.shift,
        s.startedAt.toISOString(),
        s.elapsed,
        r?.score ?? null,
        r?.accuracy ?? null,
      ]);
    }
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=mindmitra-progress.csv",
        "Cache-Control": "no-store",
      },
    });
  }
  if (path[0] === "export") {
    const data = await db.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        language: true,
        dailyGoal: true,
        targetExams: true,
        favoriteExams: true,
        reminder: true,
        targetDate: true,
        reports: true,
        contributorAlias: true,
        contributions: {
          select: {
            id: true,
            examId: true,
            year: true,
            stage: true,
            shift: true,
            title: true,
            sourceUrl: true,
            permissionEvidence: true,
            checksum: true,
            status: true,
            reviewNote: true,
            createdAt: true,
            paperId: true,
          },
        },
        createdAt: true,
        tasks: true,
        practices: { include: { answers: true } },
        games: true,
        watches: true,
        bookmarks: true,
        videoBookmarks: true,
      },
    });
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=mindmitra-data.json",
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    if (!validRequestOrigin(req))
      return NextResponse.json({ error: ORIGIN_ERROR }, { status: 403 });
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const size = Number(req.headers.get("content-length") ?? 0);
    if (size > 2000000)
      return NextResponse.json(
        { error: "Import exceeds 2 MB" },
        { status: 413 },
      );
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 2000000)
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const body: unknown = JSON.parse(raw);
    const { path } = await ctx.params;
    const [action, id] = path;
    const minute = Math.floor(Date.now() / 60000);
    const key = `${user.id}:${minute}`;
    const bucket = await db.rateBucket.upsert({
      where: { key },
      create: { key, count: 1, expiresAt: new Date(Date.now() + 120000) },
      update: { count: { increment: 1 } },
    });
    await db.rateBucket.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (bucket.count > 120)
      return NextResponse.json({ error: "Please slow down" }, { status: 429 });
    if (action === "exam-favorite") {
      const d = z
        .object({ examId: z.string(), saved: z.boolean() })
        .parse(body);
      if (!(await db.exam.findUnique({ where: { id: d.examId } })))
        throw new Error("Unknown exam");
      await db.$transaction(
        async (tx) => {
          const u = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
          const ids = new Set(u.favoriteExams);
          if (d.saved) ids.add(d.examId);
          else ids.delete(d.examId);
          if (ids.size > 100) throw new Error("Favorite limit reached");
          await tx.user.update({
            where: { id: user.id },
            data: { favoriteExams: [...ids] },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return ok({ saved: d.saved });
    }
    if (action === "contributor-profile") {
      const d = z
        .object({
          alias: z
            .string()
            .trim()
            .max(30)
            .regex(/^[a-zA-Z0-9 _-]*$/),
        })
        .parse(body);
      await db.user.update({
        where: { id: user.id },
        data: { contributorAlias: d.alias || null },
      });
      return ok({ saved: true });
    }
    if (action === "language") {
      const d = z.object({ language: z.enum(["en", "hi"]) }).parse(body);
      await db.user.update({ where: { id: user.id }, data: d });
      return ok({ saved: true });
    }
    if (action === "profile") {
      const data = profileInput.parse(body);
      if (
        data.targetExams.length !==
        (await db.exam.count({ where: { id: { in: data.targetExams } } }))
      )
        throw new Error("Unknown examination");
      await db.user.update({
        where: { id: user.id },
        data: {
          ...data,
          targetDate: data.targetDate
            ? z.coerce.date().parse(data.targetDate)
            : null,
          onboarded: true,
        },
      });
      return ok({ saved: true });
    }
    if (action === "logout-all") {
      await db.session.deleteMany({ where: { userId: user.id } });
      return ok({ saved: true });
    }
    if (action === "delete-account") {
      z.object({ confirmation: z.literal("DELETE") }).parse(body);
      await db.user.delete({ where: { id: user.id } });
      return ok({ deleted: true });
    }
    if (action === "tasks") {
      const d = z
        .object({
          title: z.string().trim().min(1).max(200),
          dueDate: z.coerce.date(),
        })
        .parse(body);
      return ok(await db.studyTask.create({ data: { ...d, userId: user.id } }));
    }
    if (action === "task-delete") {
      const r = await db.studyTask.deleteMany({
        where: { id, userId: user.id },
      });
      return ok({ deleted: r.count === 1 });
    }
    if (action === "task") {
      const d = z
        .object({
          done: z.boolean().optional(),
          title: z.string().trim().min(1).max(200).optional(),
          dueDate: z.coerce.date().optional(),
        })
        .refine((d) => Object.keys(d).length > 0)
        .parse(body);
      const r = await db.studyTask.updateMany({
        where: { id, userId: user.id },
        data: d,
      });
      return ok({ saved: r.count === 1 });
    }
    if (action === "practice") {
      const d = z
        .object({
          paperId: z.string(),
          mode: z.enum(["timed", "untimed"]),
          subject: z.string().max(120).optional(),
          topic: z.string().max(120).optional(),
          selection: z
            .enum(["all", "incorrect", "bookmarked", "unsolved"])
            .optional(),
          limit: z.number().int().min(1).max(1000).optional(),
        })
        .parse(body);
      return ok(await createPractice(user.id, d.paperId, d.mode, d));
    }
    if (action === "position") {
      const d = z.object({ current: z.number().int().min(0) }).parse(body);
      const s = await db.practiceSession.findFirst({
        where: { id, userId: user.id, submittedAt: null },
        include: { _count: { select: { questions: true } } },
      });
      if (!s || d.current >= s._count.questions)
        throw new Error("Invalid question position");
      await db.practiceSession.updateMany({
        where: { id, userId: user.id, submittedAt: null },
        data: { current: d.current },
      });
      return ok({ saved: true });
    }
    if (action === "heartbeat") {
      const d = z.object({ reset: z.boolean() }).parse(body);
      await db.$transaction(
        async (tx) => {
          const s = await tx.practiceSession.findFirst({
            where: { id, userId: user.id, submittedAt: null },
          });
          if (!s) throw new Error("Session unavailable");
          const delta = d.reset
            ? 0
            : Math.max(
                0,
                Math.min(
                  15,
                  Math.floor((Date.now() - s.lastActiveAt.getTime()) / 1000),
                ),
              );
          await tx.practiceSession.update({
            where: { id },
            data: { lastActiveAt: new Date(), elapsed: { increment: delta } },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return ok({ saved: true });
    }
    if (action === "answer") {
      const d = z
        .object({
          questionId: z.string(),
          selected: z.number().int().min(0).max(7).nullable().default(null),
          selectedOptions: z
            .array(z.number().int().min(0).max(7))
            .max(8)
            .default([]),
          reviewed: z.boolean(),
          current: z.number().int().nonnegative(),
          text: z.string().max(20000).optional(),
        })
        .parse(body);
      await db.$transaction(
        async (tx) => {
          const s = await tx.practiceSession.findFirst({
            where: { id, userId: user.id },
            include: {
              paper: true,
              questions: { include: { question: true } },
            },
          });
          if (!s || s.submittedAt) throw new Error("Session unavailable");
          if (
            s.mode === "timed" &&
            Date.now() > s.startedAt.getTime() + s.paper.durationMinutes * 60000
          )
            throw new Error("Time is up. Submit your paper.");
          const q = s.questions.find((q) => q.questionId === d.questionId);
          if (!q || d.current >= s.questions.length)
            throw new Error("Invalid answer");
          const snapshot = q.snapshot as { type: string; options: string[] };
          if (
            new Set(d.selectedOptions).size !== d.selectedOptions.length ||
            d.selectedOptions.some((i) => i >= snapshot.options.length)
          )
            throw new Error("Invalid multi-select answer");
          if (snapshot.type !== "DESCRIPTIVE" && d.text?.trim())
            throw new Error(
              "Only descriptive questions accept written responses",
            );
          if (snapshot.type === "MSQ") {
            if (d.selected !== null)
              throw new Error("MSQs require selectedOptions");
          } else if (
            d.selectedOptions.length ||
            (d.selected !== null &&
              (snapshot.type === "DESCRIPTIVE" ||
                d.selected >= snapshot.options.length))
          )
            throw new Error("Invalid answer");
          await tx.studentAnswer.upsert({
            where: {
              sessionId_questionId: { sessionId: id, questionId: d.questionId },
            },
            create: {
              sessionId: id,
              questionId: d.questionId,
              selected: d.selected,
              selectedOptions: d.selectedOptions,
              reviewed: d.reviewed,
              text: d.text,
            },
            update: {
              selected: d.selected,
              selectedOptions: d.selectedOptions,
              reviewed: d.reviewed,
              text: d.text,
            },
          });
          await tx.practiceSession.update({
            where: { id },
            data: { current: d.current },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return ok({ saved: true });
    }
    if (action === "submit") return ok(await submitPractice(user.id, id));
    if (action === "bookmark") {
      const d = z
        .object({ questionId: z.string(), saved: z.boolean() })
        .parse(body);
      if (
        !(await db.question.findFirst({
          where: {
            id: d.questionId,
            verified: true,
            paper: {
              status: "PUBLISHED",
              source: { permission: "AUTHORIZED" },
            },
          },
        }))
      )
        throw new Error("Question unavailable");
      if (d.saved)
        await db.bookmark.upsert({
          where: {
            userId_questionId: { userId: user.id, questionId: d.questionId },
          },
          create: { userId: user.id, questionId: d.questionId },
          update: {},
        });
      else
        await db.bookmark.deleteMany({
          where: { userId: user.id, questionId: d.questionId },
        });
      return ok({ saved: d.saved });
    }
    if (action === "games") {
      const d = z
        .object({
          game: z.enum([
            "memory-match",
            "number-merge",
            "pattern-pulse",
            "sliding-puzzle",
          ]),
          score: z.number().int().min(0).max(1000000),
          duration: z.number().int().min(1).max(3600),
        })
        .parse(body);
      return ok(
        await db.gameSession.create({ data: { ...d, userId: user.id } }),
      );
    }
    if (action === "watch") {
      const d = z
        .object({
          videoId: z.string(),
          seconds: z.number().int().min(0).max(600),
        })
        .parse(body);
      if (
        !(await db.video.findFirst({
          where: { id: d.videoId, approved: true },
        }))
      )
        throw new Error("Video unavailable");
      return ok(
        await db.watchSession.create({ data: { ...d, userId: user.id } }),
      );
    }
    if (action === "video-bookmark") {
      const d = z
        .object({ videoId: z.string(), saved: z.boolean() })
        .parse(body);
      if (
        !(await db.video.findFirst({
          where: { id: d.videoId, approved: true },
        }))
      )
        throw new Error("Video unavailable");
      if (d.saved)
        await db.videoBookmark.upsert({
          where: { userId_videoId: { userId: user.id, videoId: d.videoId } },
          create: { userId: user.id, videoId: d.videoId },
          update: {},
        });
      else
        await db.videoBookmark.deleteMany({
          where: { userId: user.id, videoId: d.videoId },
        });
      return ok({ saved: d.saved });
    }
    if (action === "report") {
      const d = z
        .object({ videoId: z.string(), reason: z.string().min(3).max(1000) })
        .parse(body);
      return ok(
        await db.$transaction(async (tx) => {
          const video = await tx.video.findFirst({
            where: { id: d.videoId, approved: true },
          });
          if (!video) throw Error("Video unavailable");
          const report = await tx.videoReport.create({
            data: { ...d, userId: user.id },
          });
          await tx.video.update({
            where: { id: d.videoId },
            data: { approved: false },
          });
          await tx.videoSubmission.updateMany({
            where: { videoId: d.videoId, status: "APPROVED" },
            data: {
              status: "PENDING",
              reviewNote:
                "Hidden after a content concern. A new full review is required.",
              reviewerId: null,
              reviewedAt: null,
            },
          });
          return report;
        }),
      );
    }

    if (action !== "admin" || user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (id === "exam") {
      const d = z
        .object({
          name: z.string().min(2).max(100),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          category: z.string().min(1).max(80),
          authority: z.string().min(1).max(120),
          subjects: z.array(z.string()).max(20),
        })
        .parse(body);
      const { authority, ...rest } = d;
      return ok(
        await db.exam.create({
          data: {
            ...rest,
            authority: {
              connectOrCreate: {
                where: { name: authority },
                create: { name: authority },
              },
            },
          },
        }),
      );
    }
    if (id === "import") {
      const d = importInput.parse(body);
      const checksum = createHash("sha256")
        .update(JSON.stringify(d))
        .digest("hex");
      return ok(
        await db.$transaction(async (tx) => {
          const p = await importPaper(tx, d);
          await tx.importJob.create({
            data: {
              actorId: user.id,
              status: "AWAITING_VERIFICATION",
              checksum,
              paperId: p.id,
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "IMPORT",
              targetId: p.id,
              detail: { checksum },
            },
          });
          return p;
        }),
      );
    }
    if (id === "question") {
      const d = z
        .object({
          questionId: z.string(),
          question: questionInput,
          note: z.string().min(10).max(4000),
        })
        .parse(body);
      return ok(
        await db.$transaction(
          async (tx) => {
            const old = await tx.question.findUniqueOrThrow({
              where: { id: d.questionId },
              include: {
                paper: true,
                keys: { orderBy: { version: "desc" }, take: 1 },
              },
            });
            if (old.paper.status === "PUBLISHED")
              throw new Error(
                "Unpublish the paper before correcting its question text",
              );
            const q = d.question;
            await tx.question.update({
              where: { id: old.id },
              data: {
                number: q.number,
                text: q.text,
                type: q.type,
                options: q.options,
                subject: q.subject,
                topic: q.topic,
                language: q.language,
                sourcePage: q.sourcePage,
                sourceRegions: q.sourceRegions,
                explanation: q.explanation,
                verified: false,
              },
            });
            await tx.answerKey.create({
              data: {
                questionId: old.id,
                version: (old.keys[0]?.version ?? 0) + 1,
                answer: q.answer,
                correctAnswers: q.correctAnswers,
                status: q.keyStatus,
                reference: q.keyReference,
              },
            });
            await tx.auditLog.create({
              data: {
                actorId: user.id,
                action: "CORRECT_QUESTION",
                targetId: old.id,
                detail: {
                  note: d.note,
                  previousText: old.text,
                  previousOptions: old.options,
                },
              },
            });
            return { saved: true };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      );
    }
    if (id === "permission") {
      const d = z
        .object({
          sourceId: z.string(),
          permission: z.enum(["PENDING", "AUTHORIZED", "DENIED"]),
          permissionEvidence: z.string().min(10).max(5000),
        })
        .parse(body);
      return ok(
        await db.$transaction(async (tx) => {
          await tx.sourceDocument.update({
            where: { id: d.sourceId },
            data: {
              permission: d.permission,
              permissionEvidence: d.permissionEvidence,
            },
          });
          if (d.permission !== "AUTHORIZED")
            await tx.paper.updateMany({
              where: { sourceId: d.sourceId },
              data: { status: "AWAITING_VERIFICATION" },
            });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "SOURCE_PERMISSION",
              targetId: d.sourceId,
              detail: {
                permission: d.permission,
                evidence: d.permissionEvidence,
              },
            },
          });
          return { saved: true };
        }),
      );
    }
    if (id === "review") {
      const d = z
        .object({
          paperId: z.string(),
          decision: z.enum(["APPROVE", "REJECT", "UNPUBLISH"]),
          note: z.string().min(10).max(4000),
        })
        .parse(body);
      return ok(
        await db.$transaction(async (tx) => {
          const p = await tx.paper.findUniqueOrThrow({
            where: { id: d.paperId },
            include: { source: true, questions: { include: { keys: true } } },
          });
          if (
            d.decision === "APPROVE" &&
            (p.source.permission !== "AUTHORIZED" || !p.questions.length)
          )
            throw new Error("Rights clearance and questions required");
          if (
            d.decision === "APPROVE" &&
            p.questions.some((q) =>
              needsCbtText({
                ...q,
                sourceRegions: Array.isArray(q.sourceRegions)
                  ? q.sourceRegions
                  : [],
              }),
            )
          )
            throw Error(
              "Complete the CBT question text and options before publication.",
            );
          await tx.verificationReview.create({
            data: { ...d, reviewerId: user.id },
          });
          await tx.question.updateMany({
            where: { paperId: p.id },
            data: {
              verified: d.decision === "APPROVE",
              ...(d.decision === "APPROVE" ? { sourceRegions: [] } : {}),
            },
          });
          await tx.paper.update({
            where: { id: p.id },
            data: {
              status:
                d.decision === "APPROVE"
                  ? "PUBLISHED"
                  : "AWAITING_VERIFICATION",
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: d.decision,
              targetId: p.id,
              detail: { note: d.note },
            },
          });
          return { saved: true };
        }),
      );
    }
    if (id === "video") {
      const d = z
        .object({
          title: z.string().min(1).max(200),
          creator: z.string().min(1).max(100),
          youtubeId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
          category: z.enum([
            "Mathematics",
            "Science",
            "History",
            "Study skills",
            "Reasoning",
            "English",
            "Current affairs",
          ]),
          approved: z.boolean(),
          safetyReviewed: z.boolean().default(false),
        })
        .parse(body);
      if (d.approved && !d.safetyReviewed)
        throw Error(
          "Confirm full educational and content safety review before approval",
        );
      const { safetyReviewed, ...videoData } = d;
      return ok(
        await db.$transaction(async (tx) => {
          const v = await tx.video.upsert({
            where: { youtubeId: d.youtubeId },
            create: videoData,
            update: videoData,
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "VIDEO_MODERATION",
              targetId: v.id,
              detail: { approved: d.approved, safetyReviewed },
            },
          });
          return v;
        }),
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002")
        return NextResponse.json(
          { error: "This record already exists" },
          { status: 409 },
        );
      if (e.code === "P2034")
        return NextResponse.json(
          { error: "Concurrent update. Please retry." },
          { status: 409 },
        );
    }
    console.error("Request failed", e instanceof Error ? e.name : "Unknown");
    return NextResponse.json(
      { error: "Unable to save. Check the input and try again." },
      { status: 400 },
    );
  }
}
