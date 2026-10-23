import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.page ?? "1") || 1),
  );
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { contributions: true, practices: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
    }),
    db.user.count({ where }),
  ]);
  return (
    <>
      <Heading
        eyebrow="ADMINISTRATION"
        title="Registered users"
        description="Private account directory. Search accounts and review contribution and practice totals."
      />
      <form className="search" action="/admin/users">
        <input
          name="q"
          aria-label="Search users"
          defaultValue={q}
          placeholder="Name or email"
        />
        <button type="submit">Search</button>
      </form>
      <section className="card section-gap">
        <p>{total} matching users</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Contributions</th>
                <th>Practice sessions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.createdAt.toISOString().slice(0, 10)}</td>
                  <td>{u._count.contributions}</td>
                  <td>{u._count.practices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row">
          {page > 1 && (
            <Link href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>
              Previous
            </Link>
          )}
          {page * 50 < total && (
            <Link href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>
              Next
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
