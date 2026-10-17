import { requireAdmin } from "@/lib/auth";
import { Text } from "@/components/translation";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
export default async function Page() {
  await requireAdmin();
  const [exams, papers, published, imports, logs] = await Promise.all([
    db.exam.count(),
    db.paper.count(),
    db.paper.count({ where: { status: "PUBLISHED" } }),
    db.importJob.count(),
    db.auditLog.findMany({ take: 30, orderBy: { createdAt: "desc" } }),
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
