import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
import {
  ContributorProfile,
  ContributionForm,
} from "@/components/contributions";
export default async function Page() {
  const user = await requireUser();
  const [exams, items] = await Promise.all([
    db.exam.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.contribution.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        status: true,
        reviewNote: true,
        createdAt: true,
        exam: { select: { name: true } },
        paper: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return (
    <>
      <Heading
        eyebrow="BUILD THE LIBRARY TOGETHER"
        title="Help the next learner."
        description="Contribute genuine exam papers. Every submission is privately reviewed before students can use it."
      />
      <Link className="chip" href="/leaderboard">
        Contributor leaderboard →
      </Link>
      <div className="card section-gap">
        <ContributionForm exams={exams} alias={user.contributorAlias ?? ""} />
      </div>
      <section className="card section-gap">
        <ContributorProfile alias={user.contributorAlias ?? ""} />
      </section>
      <section className="card section-gap">
        <h2>Your submissions</h2>
        {!items.length && <p>No submissions yet.</p>}
        {items.map((c) => (
          <article key={c.id} className="section-gap">
            <h3>{c.title}</h3>
            <p>
              {c.exam.name} · {c.status}
              {c.status === "APPROVED" && c.paper?.status !== "PUBLISHED"
                ? " (paper currently unpublished; no leaderboard credit)"
                : ""}{" "}
              ·{" "}
              {c.createdAt.toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            </p>
            {c.reviewNote && <p>Reviewer: {c.reviewNote}</p>}
            <a className="text-link" href={`/api/contributions/${c.id}`}>
              Download your submission
            </a>
          </article>
        ))}
      </section>
    </>
  );
}
