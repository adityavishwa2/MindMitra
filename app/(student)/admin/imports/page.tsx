import { requireAdmin } from "@/lib/auth";
import { Text } from "@/components/translation";
import { db } from "@/lib/db";
import { JsonImport } from "@/components/admin";
import { Heading } from "@/components/ui";
export default async function Page() {
  await requireAdmin();
  const [exams, jobs] = await Promise.all([
    db.exam.findMany({ orderBy: { name: "asc" } }),
    db.importJob.findMany({ take: 30, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <Heading
        eyebrow="SOURCE → IMPORT → REVIEW → PUBLISH"
        title="Bring trustworthy content in."
        description="Only import material whose provenance and reuse permission you can document."
      />
      <div className="card">
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
