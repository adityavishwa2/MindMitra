import Link from "next/link";
import { ContributionForm } from "@/components/contributions";
import { requireAdmin } from "@/lib/auth";
import { Text } from "@/components/translation";
import { db } from "@/lib/db";
import { JsonImport } from "@/components/admin";
import { Heading } from "@/components/ui";
export default async function Page() {
  await requireAdmin();
  const [exams, jobs, pdfs] = await Promise.all([
    db.exam.findMany({ orderBy: { name: "asc" } }),
    db.importJob.findMany({ take: 30, orderBy: { createdAt: "desc" } }),
    db.contribution.findMany({
      where: { adminUpload: true },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  return (
    <>
      <Heading
        eyebrow="SOURCE → IMPORT → REVIEW → PUBLISH"
        title="Bring trustworthy content in."
        description="Only import material whose provenance and reuse permission you can document."
      />
      <section className="card">
        <ContributionForm exams={exams} alias="" adminUpload />
      </section>
      <section className="card section-gap">
        <h2>PDF inbox</h2>
        <p>
          Open an uploaded PDF to download the original, prepare its question
          JSON and verify the answer key before publishing. Admin uploads earn
          no leaderboard points.
        </p>
        {pdfs.length ? (
          pdfs.map((p) => (
            <p key={p.id}>
              <Link className="text-link" href={`/admin/contributions/${p.id}`}>
                {p.title} →
              </Link>
              {" · "}
              {p.status}
            </p>
          ))
        ) : (
          <p>No admin PDFs uploaded yet.</p>
        )}
      </section>
      <div className="card section-gap">
        <h2>Import prepared questions (JSON)</h2>
        <JsonImport exams={exams} />
      </div>
      <div className="card section-gap">
        <h3>
          <Text value="Import history" />
        </h3>
        {jobs.map((j) => (
          <p key={j.id}>
            {j.id} · {j.status} · {j.createdAt.toISOString()}
          </p>
        ))}
      </div>
    </>
  );
}
