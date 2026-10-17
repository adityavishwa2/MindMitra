import { requireUser } from "@/lib/auth";
import { FavoriteExam } from "@/components/forms";
import { Text } from "@/components/translation";
import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { Heading, EmptyState } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    state?: string;
    favorites?: string;
  }>;
}) {
  const {
    q = "",
    category = "",
    state = "",
    favorites = "",
  } = await searchParams;
  const user = await requireUser();
  const exams = await db.exam.findMany({
    where: {
      name: { contains: q.slice(0, 100), mode: "insensitive" },
      ...(category ? { category } : {}),
      ...(state ? { state } : {}),
      ...(favorites ? { id: { in: user.favoriteExams } } : {}),
    },
    include: {
      authority: true,
      papers: {
        where: { status: "PUBLISHED", source: { permission: "AUTHORIZED" } },
        include: {
          _count: { select: { questions: { where: { verified: true } } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <Heading
        eyebrow="A CLEARER PATH TO YOUR GOALS"
        title="Find your next chapter."
        description="Choose your examination. Explore verified availability. Practice at your own pace."
      />
      <form className="filters">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search examinations…"
          aria-label="Search exams"
        />
        <select
          name="category"
          defaultValue={category}
          aria-label="Exam category"
        >
          <option value="">
            <Text value="All categories" />
          </option>
          {[
            "SSC",
            "Railways",
            "UPSC",
            "Banking",
            "Teaching",
            "Entrance",
            "State",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select name="state" defaultValue={state} aria-label="State">
          <option value="">All states</option>
          {[
            "Uttar Pradesh",
            "Bihar",
            "Madhya Pradesh",
            "Rajasthan",
            "Maharashtra",
            "West Bengal",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <label className="row">
          <input
            style={{ width: 18, minHeight: 18 }}
            type="checkbox"
            name="favorites"
            value="1"
            defaultChecked={!!favorites}
          />
          My favorites
        </label>
        <button className="button">
          <Text value="Find my exam" />
        </button>
      </form>
      <p className="notice" style={{ marginBottom: 24 }}>
        <Text value="A directory is a starting point, not a coverage claim. Only reviewed, authorized papers appear in practice. No fictional PYQs are included." />
      </p>
      <div className="grid-3">
        {exams.map((e) => (
          <article className="card exam-card" key={e.id}>
            <div className="spread">
              <span className="icon-box">
                <BookOpen size={23} />
              </span>
              <span className="badge">{e.category}</span>
              <FavoriteExam
                id={e.id}
                saved={user.favoriteExams.includes(e.id)}
              />
            </div>
            <h3>
              <Link href={`/exams/${e.slug}`}>{e.name}</Link>
            </h3>
            <p>{e.authority.name}</p>
            <div className="card-stats">
              <span>
                {e.papers.length}
                <Text value="published papers" />
              </span>
              <span>
                {e.papers.reduce((n, p) => n + p._count.questions, 0)}
                <Text value="verified questions" />
              </span>
            </div>
            <Link className="text-link" href={`/exams/${e.slug}`}>
              {e.papers.length ? "Explore papers" : "View collection status"}{" "}
              <ArrowUpRight size={15} />
            </Link>
          </article>
        ))}
      </div>
      {!exams.length && (
        <EmptyState title="No examinations match">
          <Text value="Try another name or category." />
        </EmptyState>
      )}
    </>
  );
}
