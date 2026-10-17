import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
import { ContributionReview } from "@/components/contributions";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const c = await db.contribution.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      status: true,
      year: true,
      stage: true,
      shift: true,
      examId: true,
      sourceUrl: true,
      permissionEvidence: true,
      checksum: true,
      payload: true,
      reviewNote: true,
      user: { select: { email: true } },
      exam: { select: { name: true } },
    },
  });
  if (!c) notFound();
  return (
    <>
      <Heading
        eyebrow="REVIEW BEFORE RECOGNITION"
        title={c.title}
        description={`${c.exam.name} · ${c.year} · ${c.stage} · ${c.shift} · ${c.status}`}
      />
      <Link className="chip" href="/admin/contributions">
        Back to queue
      </Link>
      <section className="card section-gap">
        <p>Submitted by: {c.user.email}</p>
        <p>Exam ID: {c.examId}</p>
        <p>
          Submitted source:{" "}
          <a
            className="text-link"
            href={c.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open source
          </a>
        </p>
        <p>Permission evidence: {c.permissionEvidence}</p>
        <p style={{ overflowWrap: "anywhere" }}>File SHA-256: {c.checksum}</p>
        <a className="button secondary" href={`/api/contributions/${c.id}`}>
          Download submitted file
        </a>
        <p>
          For PDF submissions, transcribe or convert the questions into the
          paper import JSON format and compare them with the source. Set
          source.checksum to the PDF hash above. Verify reuse permission,
          options, scoring and answer references. Missing or disputed keys must
          be marked accordingly.
        </p>
        {c.reviewNote && <p>Latest review: {c.reviewNote}</p>}
        {c.userId === admin.id ? (
          <p>
            You cannot review your own submission. Use Import papers for your
            own content.
          </p>
        ) : (
          <ContributionReview
            id={c.id}
            status={c.status}
            payload={c.payload ? JSON.stringify(c.payload, null, 2) : ""}
          />
        )}
      </section>
    </>
  );
}
