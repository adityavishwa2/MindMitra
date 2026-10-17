import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
import { contributionPoints } from "@/lib/contributions";
export default async function Page() {
  await requireUser();
  const rows = await db.contribution.groupBy({
    by: ["userId"],
    where: {
      status: "APPROVED",
      adminUpload: false,
      paper: { status: "PUBLISHED" },
      user: { contributorAlias: { not: null } },
    },
    _count: { id: true },
    orderBy: [{ _count: { id: "desc" } }, { userId: "asc" }],
    take: 100,
  });
  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, contributorAlias: true },
  });
  const aliases = new Map(users.map((u) => [u.id, u.contributorAlias]));

  return (
    <>
      <Heading
        eyebrow="A THANK YOU TO OUR CONTRIBUTORS"
        title="Small contributions. Shared progress."
        description="10 points per approved, published paper. Equal totals share a rank. Pending, rejected, duplicate, revoked and unpublished papers do not count."
      />
      <Link href="/contribute" className="button">
        Contribute a paper
      </Link>
      <section className="card section-gap">
        <h2>Top contributors</h2>
        <p>
          Participation is optional. Only your chosen public alias appears here.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Contributor</th>
                <th>Published papers</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rank =
                  rows.findIndex((other) => other._count.id === r._count.id) +
                  1;
                return (
                  <tr key={r.userId}>
                    <td>{rank}</td>
                    <td>{aliases.get(r.userId)}</td>
                    <td>{r._count.id}</td>
                    <td>{contributionPoints(r._count.id)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p>The leaderboard starts with the first approved contribution.</p>
        )}
      </section>
    </>
  );
}
