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
  ]);
  return (
    <>
      <Heading
        eyebrow="MINDFUL CONTENT OPERATIONS"
        title="Care behind every question."
        description="Manage sources, verify content, and publish with a clear audit trail."
      />
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
    </>
  );
}
