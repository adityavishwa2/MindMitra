import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Text } from "@/components/translation";
import { Heading } from "@/components/ui";
import { AdminVideoForm } from "@/components/admin";
import { db } from "@/lib/db";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
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
  const [videos, reports, submissions, total] = await Promise.all([
    db.video.findMany({ take: 50 }),
    db.videoReport.findMany({
      take: 30,
      include: { video: true },
      orderBy: { createdAt: "desc" },
    }),
    db.videoSubmission.findMany({
      where: { status },
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        userId: true,
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * 30,
      take: 30,
    }),
    db.videoSubmission.count({ where: { status } }),
  ]);
  return (
    <>
      <Heading
        eyebrow="CURATE FOR CURIOSITY"
        title="Review videos"
        description="1. Open a lesson. 2. Watch and complete the checks. 3. Add a note and approve or reject."
      />
      <nav className="filters" aria-label="Video review status">
        {[
          ["PENDING", "Awaiting approval"],
          ["APPROVED", "Published"],
          ["REJECTED", "Rejected"],
          ["REVOKED", "Hidden after review"],
        ].map(([value, label]) => (
          <Link
            key={value}
            className="chip"
            aria-current={status === value ? "page" : undefined}
            href={`?status=${value}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="card section-gap">
        <h2>
          {status === "PENDING"
            ? "Lessons awaiting approval"
            : "Reviewed lessons"}{" "}
          ({total})
        </h2>
        <p>
          Review the whole video and audio. Only educational videos that satisfy
          every content check can be published.
        </p>
        {!submissions.length && <p>No videos in this list.</p>}
        {submissions.map((s) => (
          <article className="admin-queue-item" key={s.id}>
            <div>
              <h3>{s.title}</h3>
              <p>
                {s.category}
                {s.userId === admin.id && status === "PENDING"
                  ? " · Your upload — ready for your review"
                  : ""}
              </p>
            </div>
            <Link className="button secondary" href={`/admin/videos/${s.id}`}>
              {status === "PENDING" ? "Review video →" : "View decision →"}
            </Link>
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
      <details className="card section-gap">
        <summary>YouTube library and student reports</summary>
        <div className="grid-2">
          <div className="card">
            <AdminVideoForm />
          </div>
          <div className="card">
            <h3>
              <Text value="Library" />
            </h3>
            {videos.map((v) => (
              <p key={v.id}>
                {v.title} · {v.youtubeId ?? "Uploaded lesson"} ·{" "}
                {v.approved ? "Approved" : "Hidden"}
              </p>
            ))}
            <h3 className="section-gap">
              <Text value="Student reports" />
            </h3>
            {reports.map((r) => (
              <p key={r.id}>
                {r.video.title}: {r.reason}
              </p>
            ))}
          </div>
        </div>
      </details>
    </>
  );
}
