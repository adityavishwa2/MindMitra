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
        title="Contribution queue"
        description="Check provenance, compare questions and answer keys, then approve and publish. Uploads remain private until reviewed."
      />
      <div className="filters">
        {["PENDING", "APPROVED", "REJECTED", "REVOKED"].map((s) => (
          <Link
            className="chip"
            key={s}
            href={`/admin/contributions?status=${s}`}
          >
            {s}
          </Link>
        ))}
      </div>
      <section className="card">
        <p>
          {total} {status.toLowerCase()} submissions
        </p>
        {items.map((c) => (
          <article key={c.id} className="section-gap">
            <Link className="text-link" href={`/admin/contributions/${c.id}`}>
              {c.title} →
            </Link>
            <p>
              {c.exam.name} · {c.year} · {c.user.email} ·{" "}
              {c.createdAt.toISOString()}
            </p>
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
