import { PaperManagement } from "@/components/paper-management";
import { SourceLink } from "@/components/source-link";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Text } from "@/components/translation";
import { db } from "@/lib/db";
import {
  ReviewPaper,
  QuestionCorrection,
  SourcePermission,
} from "@/components/admin";
import { Heading, EmptyState } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const published = (await searchParams).status === "PUBLISHED";
  const papers = await db.paper.findMany({
    where: { status: published ? "PUBLISHED" : { not: "PUBLISHED" } },
    include: {
      exam: true,
      source: true,
      questions: {
        orderBy: { number: "asc" },
        include: { keys: { orderBy: { version: "desc" } } },
      },
    },
    take: 50,
    orderBy: { year: "desc" },
  });
  return (
    <>
      <Heading
        eyebrow="TRUST REQUIRES A HUMAN LOOK"
        title="Existing paper library"
        description="Compare every question with its original source. Publication requires documented reuse authorization."
      />
      <p className="notice">
        For uploaded PDFs and community submissions,{" "}
        <Link className="text-link" href="/admin/contributions">
          open Review papers →
        </Link>
        . This library contains prepared imports and existing papers.
      </p>
      <nav className="filters" aria-label="Paper library status">
        <Link
          className="chip"
          href="/admin/questions"
          aria-current={!published ? "page" : undefined}
        >
          Awaiting verification
        </Link>
        <Link
          className="chip"
          href="?status=PUBLISHED"
          aria-current={published ? "page" : undefined}
        >
          Published papers
        </Link>
      </nav>
      {papers.length ? (
        papers.map((p) => (
          <section className="card section-gap" key={p.id}>
            <span className="badge">{p.status}</span>
            <PaperManagement
              id={p.id}
              kind="paper"
              published={p.status === "PUBLISHED"}
            />
            <h3 className="section-gap">
              {p.exam.name} · {p.title}
            </h3>
            <p>
              {p.year} · {p.stage} · {p.shift} · {p.questions.length}
              <Text value="questions" />
            </p>
            <p>
              <Text value="Reuse:" />
              {p.source.permission} — {p.source.permissionEvidence}
            </p>
            <SourceLink url={p.source.url}>
              <Text value="Open original source ↗" />
            </SourceLink>
            <p style={{ fontSize: 10, overflowWrap: "anywhere" }}>
              SHA-256: {p.source.checksum}
            </p>
            <SourcePermission
              sourceId={p.sourceId}
              initialPermission={p.source.permission}
              initialEvidence={p.source.permissionEvidence}
            />
            <details className="section-gap">
              <summary>
                Check {p.questions.length} questions and answer keys
              </summary>
              {p.questions.map((q) => (
                <details key={q.id}>
                  <summary>
                    Q{q.number} · {q.subject}
                    <Text value="· page" />
                    {q.sourcePage}
                  </summary>
                  <p style={{ whiteSpace: "pre-wrap" }}>{q.text}</p>
                  <ol type="A">
                    {q.options.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ol>
                  {q.keys.map((k) => (
                    <p key={k.id}>
                      <Text value="Key v" />
                      {k.version}:{" "}
                      {q.type === "MSQ"
                        ? k.correctAnswers
                            .map((i) => String.fromCharCode(65 + i))
                            .join(", ") || "Unscored"
                        : k.answer === null
                          ? "Unscored"
                          : String.fromCharCode(65 + k.answer)}{" "}
                      · {k.status} · {k.reference}
                    </p>
                  ))}
                  {p.status !== "PUBLISHED" && (
                    <QuestionCorrection
                      questionId={q.id}
                      initial={JSON.stringify(
                        {
                          number: q.number,
                          text: q.text,
                          type: q.type,
                          options: q.options,
                          subject: q.subject,
                          topic: q.topic,
                          language: q.language,
                          sourcePage: q.sourcePage,
                          sourceRegions: q.sourceRegions,
                          answer: q.keys[0]?.answer ?? null,
                          correctAnswers: q.keys[0]?.correctAnswers ?? [],
                          keyStatus: q.keys[0]?.status ?? "UNAVAILABLE",
                          keyReference: q.keys[0]?.reference ?? "",
                          explanation: q.explanation ?? "",
                        },
                        null,
                        2,
                      )}
                    />
                  )}
                </details>
              ))}
            </details>
            <ReviewPaper paperId={p.id} published={p.status === "PUBLISHED"} />
          </section>
        ))
      ) : (
        <EmptyState title="Nothing in the queue yet">
          <Text value="Import an authorized structured paper to begin verification." />
        </EmptyState>
      )}
    </>
  );
}
