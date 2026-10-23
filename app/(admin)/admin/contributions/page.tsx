import { PaperManagement } from "@/components/paper-management";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = ["PENDING", "APPROVED", "REJECTED", "REVOKED"].includes(
    params.status ?? "",
  )
    ? params.status!
    : "PENDING";
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.page ?? "1") || 1),
  );
  const [items, total] = await Promise.all([
    db.contribution.findMany({
      where: { status },
      select: {
        id: true,
        title: true,
        year: true,
        createdAt: true,
        conversionStatus: true,
        exam: { select: { name: true } },
        user: { select: { email: true, contributorAlias: true } },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * 30,
      take: 30,
    }),
    db.contribution.count({ where: { status } }),
  ]);
  return (
    <>
      <Heading
        eyebrow="COMMUNITY CONTENT REVIEW"
        title="Review papers"
        description="1. Open a paper. 2. Check questions and answers. 3. Confirm permission and publish to practice."
      />
      <div className="filters">
        {["PENDING", "APPROVED", "REJECTED", "REVOKED"].map((s) => (
          <Link
            className="chip"
            aria-current={status === s ? "page" : undefined}
            key={s}
            href={`/admin/contributions?status=${s}`}
          >
            {
              {
                PENDING: "Awaiting approval",
                APPROVED: "Published",
                REJECTED: "Rejected",
                REVOKED: "Unpublished",
              }[s]
            }
          </Link>
        ))}
      </div>
      <p>
        <Link className="text-link" href="/admin/questions">
          Existing paper library / prepared JSON reviews →
        </Link>
      </p>
      <section className="card">
        <p>
          {total} {status.toLowerCase()} submissions
        </p>
        {!items.length && (
          <p>
            No papers in this list.{" "}
            <Link className="text-link" href="/admin/imports">
              Upload a PDF
            </Link>{" "}
            or{" "}
            <Link className="text-link" href="/admin/questions">
              review prepared papers in the existing library
            </Link>
            .
          </p>
        )}
        {items.map((c) => (
          <article key={c.id} className="admin-queue-item">
            <div>
              <h3>{c.title}</h3>
              <p>
                {c.exam.name} · {c.year}
              </p>
              <p className="muted">
                {c.conversionStatus === "FAILED"
                  ? "Conversion failed — open to retry"
                  : ["QUEUED", "PROCESSING"].includes(c.conversionStatus)
                    ? "Converting PDF — you can follow progress"
                    : "Open to check questions, answers and permission"}
              </p>
            </div>
            <Link
              className="button secondary"
              href={`/admin/contributions/${c.id}`}
            >
              {status === "PENDING" ? "Review paper →" : "View decision →"}
            </Link>
            <PaperManagement
              id={c.id}
              kind="contribution"
              published={status === "APPROVED"}
            />
          </article>
        ))}
        <div className="row">
          {page > 1 && (
            <Link href={`?status=${status}&page=${page - 1}`}>Previous</Link>
          )}
          {page * 30 < total && (
            <Link href={`?status=${status}&page=${page + 1}`}>Next</Link>
          )}
        </div>
      </section>
    </>
  );
}
