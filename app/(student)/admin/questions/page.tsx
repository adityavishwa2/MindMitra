import { requireAdmin } from "@/lib/auth";
import { Text } from "@/components/translation";
import { db } from "@/lib/db";
import {
  ReviewPaper,
  QuestionCorrection,
  SourcePermission,
} from "@/components/admin";
import { Heading, EmptyState } from "@/components/ui";
export default async function Page() {
  await requireAdmin();
  const papers = await db.paper.findMany({
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
        title="The verification desk."
        description="Compare every question with its original source. Publication requires documented reuse authorization."
      />
      {papers.length ? (
        papers.map((p) => (
          <section className="card section-gap" key={p.id}>
            <span className="badge">{p.status}</span>
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
            <a
              className="text-link"
              href={p.source.url}
              target="_blank"
              rel="noreferrer"
            >
              <Text value="Open original source ↗" />
            </a>
            <p style={{ fontSize: 10, overflowWrap: "anywhere" }}>
              SHA-256: {p.source.checksum}
            </p>
            <SourcePermission sourceId={p.sourceId} />
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
                    {k.answer === null
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
                        answer: q.keys[0]?.answer ?? null,
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
