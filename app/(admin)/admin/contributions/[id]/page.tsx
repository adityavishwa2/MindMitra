import { PaperManagement } from "@/components/paper-management";
import { OriginalPaper } from "@/components/original-paper";
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
      adminUpload: true,
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
      conversionStatus: true,
      reviewNote: true,
      user: { select: { email: true } },
      exam: { select: { name: true } },
    },
  });
  if (!c) notFound();
  const exams = c.sourceUrl.startsWith("urn:sha256:")
    ? await db.exam.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];
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
      <div className="pdf-review-layout">
        {c.conversionStatus !== "NOT_REQUIRED" && <OriginalPaper id={c.id} />}
        <section className="card section-gap">
          <p>
            {c.adminUpload ? "Admin PDF upload" : "Community submission"} ·
            Submitted by: {c.user.email}
          </p>
          <a className="button secondary" href={`/api/contributions/${c.id}`}>
            Download original paper
          </a>
          <details className="section-gap">
            <summary>Source and submission details</summary>
            <p>
              Source:{" "}
              {c.sourceUrl.startsWith("https://") ? (
                <a
                  className="text-link"
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open source
                </a>
              ) : (
                "Uploaded PDF (identified by its file checksum)"
              )}
            </p>
            <p>Permission evidence: {c.permissionEvidence}</p>
            <p style={{ overflowWrap: "anywhere" }}>
              File SHA-256: {c.checksum}
            </p>
            <p>Exam ID: {c.examId}</p>
          </details>
          <PaperManagement
            id={c.id}
            kind="contribution"
            published={c.status === "APPROVED"}
            detail
          />
          {c.reviewNote && <p>Latest review: {c.reviewNote}</p>}
          {c.userId === admin.id && !c.adminUpload ? (
            <p>
              You cannot review your own community submission. Ask another
              administrator to review it, or use{" "}
              <Link className="text-link" href="/admin/imports">
                Upload a paper
              </Link>{" "}
              for your own admin content.
            </p>
          ) : (
            <ContributionReview
              starterDraft={JSON.stringify({
                examId: c.examId,
                year: c.year,
                stage: c.stage,
                shift: c.shift,
                title: c.title,
                marks: 1,
                penalty: 0,
                durationMinutes: 120,
                source: {
                  title: c.title,
                  url: c.sourceUrl,
                  checksum: c.checksum,
                  permission: "PENDING",
                  permissionEvidence: c.permissionEvidence,
                },
                questions: [
                  {
                    number: 1,
                    text: "",
                    type: "MCQ",
                    options: ["", "", "", ""],
                    subject: "Unclassified",
                    topic: "",
                    language: "en",
                    sourcePage: 1,
                    sourceRegions: [],
                    answer: null,
                    correctAnswers: [],
                    keyStatus: "UNAVAILABLE",
                    keyReference: "",
                  },
                ],
              })}
              key={`${c.id}-${c.status}`}
              id={c.id}
              exams={exams}
              status={c.status}
              conversionStatus={c.conversionStatus}
              credit={!c.adminUpload}
              payload={c.payload ? JSON.stringify(c.payload, null, 2) : ""}
            />
          )}
        </section>
      </div>
    </>
  );
}
