import Link from "next/link";
import { Text } from "@/components/translation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { analytics } from "@/lib/analytics";
import { Heading, EmptyState } from "@/components/ui";
import { ActivityChart, PrintReport } from "@/components/charts";
export default async function Page() {
  const u = await requireUser();
  const [a, games, bookmarks] = await Promise.all([
    analytics(u.id),
    db.gameSession.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.bookmark.findMany({
      where: {
        userId: u.id,
        question: {
          paper: { status: "PUBLISHED", source: { permission: "AUTHORIZED" } },
        },
      },
      include: {
        question: { include: { paper: { include: { exam: true } } } },
      },
      take: 50,
    }),
  ]);
  return (
    <>
      <div className="spread">
        <Heading
          eyebrow="YOUR EFFORT, MADE VISIBLE"
          title="Look how you’re growing."
          description="Real activity. Your own pace. No comparisons."
        />
        <div className="row no-print">
          <Link
            download
            prefetch={false}
            className="button secondary"
            href="/api/report"
          >
            <Text value="Export CSV" />
          </Link>
          <PrintReport />
        </div>
      </div>
      <section className="metrics">
        {[
          ["Unique PYQs attempted", a.unique],
          ["Scorable accuracy", a.accuracy === null ? "—" : `${a.accuracy}%`],
          ["Completed full papers", a.completedPapers],
          ["Longest study streak", `${a.longest} days`],
        ].map(([k, v]) => (
          <div key={k} className="card metric">
            <small>{k}</small>
            <strong>{v}</strong>
          </div>
        ))}
      </section>
      <div className="grid-2">
        <div className="card">
          <h3>
            <Text value="Your practice rhythm" />
          </h3>
          {a.daily.length ? (
            <ActivityChart data={a.daily.slice(-30)} />
          ) : (
            <EmptyState title="Every story starts somewhere">
              <Text value="Your recorded study activity will appear here after your first submitted practice." />
            </EmptyState>
          )}
        </div>
        <div className="card">
          <h3>
            <Text value="Subjects, a little clearer" />
          </h3>
          {a.subjects.length ? (
            a.subjects.map((s) => (
              <div className="section-gap" key={s.subject}>
                <div className="spread">
                  <span>{s.subject}</span>
                  <strong>
                    {Math.round((s.correct / s.attempted) * 100)}%
                  </strong>
                </div>
                <div className="progress-track">
                  <span
                    style={{ width: `${(s.correct / s.attempted) * 100}%` }}
                  />
                </div>
                <small className="muted">
                  {s.correct}
                  <Text value="correct of" />
                  {s.attempted}
                  <Text value="scorable attempts" />
                </small>
              </div>
            ))
          ) : (
            <p>
              <Text value="Once you’ve practiced, we’ll help you see where you’re finding your feet and where another look might help." />
            </p>
          )}
        </div>
      </div>
      <section className="card section-gap">
        <h3>
          <Text value="Year by year, paper by paper" />
        </h3>
        <p>
          <Text value="Completion measures unique attempted questions within the currently verified collection. It does not mean all historical papers have been collected." />
        </p>
        {a.years.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <Text value="Examination" />
                  </th>
                  <th>
                    <Text value="Year" />
                  </th>
                  <th>
                    <Text value="Unique attempted" />
                  </th>
                  <th>
                    <Text value="Full papers" />
                  </th>
                  <th>
                    <Text value="Collection progress" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {a.years.map((y) => (
                  <tr key={y.exam + y.year}>
                    <td>{y.exam}</td>
                    <td>{y.year}</td>
                    <td>
                      {y.attempted} / {y.total}
                    </td>
                    <td>
                      {y.completed} / {y.papers}
                    </td>
                    <td>
                      {y.total ? Math.round((y.attempted / y.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            <Text value="No published verified paper inventory yet. Historical coverage is pending." />
          </p>
        )}
      </section>
      <div className="grid-2 section-gap">
        <section className="card">
          <h3>
            <Text value="Little milestones" />
          </h3>
          {a.unique >= 10 && (
            <div className="achievement">
              <span>✦</span>
              <div>
                <strong>
                  <Text value="Your first 10 PYQs" />
                </strong>
                <p>
                  <Text value="A little consistency, a little progress." />
                </p>
              </div>
            </div>
          )}
          {a.completedPapers > 0 && (
            <div className="achievement">
              <span>▱</span>
              <strong>
                <Text value="Your first full paper" />
              </strong>
            </div>
          )}
          {games.length > 0 && (
            <div className="achievement">
              <span>✿</span>
              <strong>
                <Text value="Made room for a brain break" />
              </strong>
            </div>
          )}
          {!a.unique && !games.length && (
            <p>
              <Text value="No milestones yet. They’ll grow from your real activity." />
            </p>
          )}
          <h3 className="section-gap">
            <Text value="Your game journal" />
          </h3>
          {games.length ? (
            <div className="table-wrap">
              <table>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.id}>
                      <td>{g.game.replaceAll("-", " ")}</td>
                      <td>
                        {g.score}
                        <Text value="points" />
                      </td>
                      <td>{g.duration}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              <Text value="Saved game results will appear here. Game points stay separate from exam scores." />
            </p>
          )}
        </section>
        <section className="card">
          <h3>
            <Text value="Saved for another look" />
          </h3>
          {bookmarks.length ? (
            bookmarks.map((b) => (
              <details key={b.questionId}>
                <summary>
                  {b.question.paper.exam.name} · Q{b.question.number}
                </summary>
                <p>{b.question.text}</p>
              </details>
            ))
          ) : (
            <p>
              <Text value="Bookmark a question during practice to keep it close for revision." />
            </p>
          )}
        </section>
      </div>
    </>
  );
}
