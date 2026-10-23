import { SourceLink } from "@/components/source-link";
import { requireUser } from "@/lib/auth";
import { Text } from "@/components/translation";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Heading } from "@/components/ui";
import { PracticeButton } from "@/components/forms";
export default async function Page({
  params,
}: {
  params: Promise<{ examSlug: string; paperId: string }>;
}) {
  await requireUser();
  const { examSlug, paperId } = await params;
  const p = await db.paper.findFirst({
    where: {
      id: paperId,
      exam: { slug: examSlug },
      status: "PUBLISHED",
      source: { permission: "AUTHORIZED" },
    },
    include: {
      exam: true,
      source: true,
      questions: {
        where: { verified: true },
        select: { subject: true, topic: true },
      },
      _count: { select: { questions: { where: { verified: true } } } },
    },
  });
  if (!p) notFound();
  return (
    <>
      <Heading
        eyebrow={p.exam.name}
        title={p.title}
        description={`${p.year} · ${p.stage} · ${p.shift}`}
      />
      <div className="grid-2">
        <div className="card">
          <h3>
            <Text value="Know your paper" />
          </h3>
          <p>
            {p._count.questions}
            <Text value="verified questions ·" />
            {p.durationMinutes} <Text value="minutes in timed mode" />
          </p>
          <p>
            <Text value="Correct answer: +" />
            {p.marks}
            <Text value="· Incorrect answer: −" />
            {p.penalty}
            <Text value=". Unavailable or disputed keys are excluded from scoring. Descriptive responses are saved for self-assessment." />
          </p>
          <PracticeButton
            paperId={p.id}
            subjects={[...new Set(p.questions.map((q) => q.subject))]}
            topics={[...new Set(p.questions.map((q) => q.topic))]}
          />
        </div>
        <div className="card">
          <h3>
            <Text value="Traceable to the source" />
          </h3>
          <p>{p.source.title}</p>
          <p>
            <Text value="Reuse status:" />
            {p.source.permission}
          </p>
          <p>{p.source.permissionEvidence}</p>
          <SourceLink url={p.source.url}>
            <Text value="Open source document ↗" />
          </SourceLink>
          <p
            className="section-gap"
            style={{ fontSize: 10, overflowWrap: "anywhere" }}
          >
            SHA-256: {p.source.checksum}
          </p>
        </div>
      </div>
    </>
  );
}
