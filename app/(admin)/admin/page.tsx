import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Text } from "@/components/translation";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
export default async function Page() {
  await requireAdmin();
  const week = new Date(new Date().getTime() - 7 * 86400000);
  const [
    exams,
    papers,
    published,
    imports,
    logs,
    users,
    newUsers,
    contributors,
    pending,
    approved,
    rejected,
    practices,
    completed,
    activeLearners,
    questions,
    contributions,
    pendingVideos,
    pendingLibrary,
  ] = await Promise.all([
    db.exam.count(),
    db.paper.count(),
    db.paper.count({ where: { status: "PUBLISHED" } }),
    db.importJob.count(),
    db.auditLog.findMany({ take: 30, orderBy: { createdAt: "desc" } }),
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: week } } }),
    db.user.count({ where: { contributions: { some: {} } } }),
    db.contribution.count({ where: { status: "PENDING" } }),
    db.contribution.count({
      where: { status: "APPROVED", paper: { status: "PUBLISHED" } },
    }),
    db.contribution.count({ where: { status: "REJECTED" } }),
    db.practiceSession.count(),
    db.practiceSession.count({ where: { submittedAt: { not: null } } }),
    db.user.count({
      where: {
        OR: [
          { practices: { some: { lastActiveAt: { gte: week } } } },
          { games: { some: { createdAt: { gte: week } } } },
          { watches: { some: { createdAt: { gte: week } } } },
        ],
      },
    }),
    db.question.count({
      where: { verified: true, paper: { status: "PUBLISHED" } },
    }),
    db.contribution.count(),
    db.videoSubmission.count({ where: { status: "PENDING" } }),
    db.paper.count({
      where: { status: "AWAITING_VERIFICATION", contribution: { is: null } },
    }),
  ]);
  return (
    <>
      <Heading
        eyebrow="YOUR PUBLISHING DESK"
        title="What will you create today?"
        description="Start with an item awaiting approval. Open it, complete the review checklist, then publish."
      />
      <section className="studio-launchpad" aria-label="Create content">
        <Link href="/admin/imports" className="studio-create-card">
          <span>01 · QUESTION PAPERS</span>
          <h2>Turn a paper into practice ↗</h2>
          <p>
            Upload your PDF → check the extracted questions → select answers →
            publish a CBT practice paper.
          </p>
          <strong>Upload a PDF</strong>
        </Link>
        {/* Full navigation applies the recorder camera/microphone policy. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/admin/videos/upload"
          className="studio-create-card studio-create-video"
        >
          <span>02 · LEARN SHORTS</span>
          <h2>Share a moment of clarity ↗</h2>
          <p>
            Upload a video → watch and complete the review → publish to the
            learning feed.
          </p>
          <strong>Upload a video</strong>
        </a>
      </section>
      <section aria-label="Awaiting approval" className="section-gap">
        <h2>What needs your review?</h2>
        <div className="grid-2 admin-review-cards">
          <Link
            href="/admin/contributions"
            aria-label="Review papers →"
            className="card admin-action"
          >
            <span className="badge">{pending} awaiting review</span>
            <h3>Review papers →</h3>
            <p>
              Open a PDF, check each question and choose correct answers, then
              publish to practice.
            </p>
          </Link>
          <Link
            href="/admin/videos"
            aria-label="Review videos →"
            className="card admin-action"
          >
            <span className="badge">{pendingVideos} awaiting review</span>
            <h3>Review videos →</h3>
            <p>
              Watch the lesson, complete the five checks and approve it for
              Learn Shorts.
            </p>
          </Link>
        </div>
        {pendingLibrary > 0 && (
          <p className="notice">
            {pendingLibrary} prepared papers also need review.{" "}
            <Link className="text-link" href="/admin/questions">
              Open existing paper library →
            </Link>
          </p>
        )}
        <p>
          <Link className="button secondary" href="/admin/imports">
            Upload a new PDF paper
          </Link>
        </p>
      </section>
      <details className="card section-gap">
        <summary>Statistics and recent activity</summary>
        <div className="metrics">
          {[
            ["Registered users", users],
            ["New users (7 days)", newUsers],
            ["Active learners (7 days)", activeLearners],
            ["Contributors", contributors],
            ["Total contributions", contributions],
            ["Contributions awaiting review", pending],
            ["Published contributions", approved],
            ["Rejected contributions", rejected],
            ["Practice sessions", practices],
            ["Completed sessions", completed],
            ["Published questions", questions],
            ["Examinations", exams],
            ["Registered papers", papers],
            ["Published papers", published],
            ["Import jobs", imports],
          ].map(([k, v]) => (
            <div key={k} className="card metric">
              <small>{k}</small>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <p className="muted">
          Active learners counts distinct users with recorded practice, game or
          video activity in the last 7 days. These are account and learning
          records, not visitor or page-view analytics.
        </p>
        <section className="card">
          <h3>
            <Text value="Recent audit activity" />
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <Text value="Action" />
                  </th>
                  <th>
                    <Text value="Record" />
                  </th>
                  <th>
                    <Text value="When" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{l.action}</td>
                    <td>{l.targetId}</td>
                    <td>{l.createdAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </details>
    </>
  );
}
