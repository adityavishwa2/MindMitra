import { requireUser } from "@/lib/auth";
import { Text } from "@/components/translation";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Heading, EmptyState, Button } from "@/components/ui";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ examSlug: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  await requireUser();
  const { examSlug } = await params;
  const { year } = await searchParams;
  const e = await db.exam.findUnique({
    where: { slug: examSlug },
    include: {
      authority: true,
      papers: {
        include: {
          source: true,
          _count: { select: { questions: { where: { verified: true } } } },
        },
        orderBy: [{ year: "desc" }, { shift: "asc" }],
      },
    },
  });
  if (!e) notFound();
  const years = [...new Set(e.papers.map((p) => p.year))];
  return (
    <>
      <Heading
        eyebrow={e.authority.name.toUpperCase()}
        title={e.name}
        description="Your progress belongs to you. Collection coverage is reported separately."
      />
      <div className="card section-gap">
        <div className="spread">
          <div>
            <h3>
              <Text value="Historical paper collection" />
            </h3>
            <p>
              {e.papers.filter((p) => p.status === "PUBLISHED").length}{" "}
              <Text value="published papers ·" />
              {years.length}
              <Text value="documented years" />
            </p>
          </div>
          <Link className="text-link" href={`/exams/${e.slug}/years`}>
            <Text value="Browse years →" />
          </Link>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          <Text value="Only papers with verified content and authorized reuse are playable. Missing papers do not imply that an examination did not take place." />
        </p>
      </div>
      <div className="filters section-gap">
        <Button href={`/exams/${e.slug}`} secondary>
          <Text value="All years" />
        </Button>
        {years.map((y) => (
          <Button key={y} secondary href={`/exams/${e.slug}?year=${y}`}>
            {y}
          </Button>
        ))}
      </div>
      {!e.papers.length ? (
        <EmptyState title="Good things take careful sourcing.">
          <Text value="No authorized, verified papers have been published for this exam yet. We won’t fill the gap with invented questions. Check the official examination authority for original publications." />
        </EmptyState>
      ) : (
        <div className="grid-2">
          {e.papers
            .filter((p) => !year || String(p.year) === year)
            .map((p) => (
              <div className="card" key={p.id}>
                <span className="badge">{p.status.replaceAll("_", " ")}</span>
                <h3 className="section-gap">{p.title}</h3>
                <p>
                  {p.year} · {p.stage} · {p.shift} · {p._count.questions}{" "}
                  <Text value="verified questions" />
                </p>
                {p.status === "PUBLISHED" &&
                p.source.permission === "AUTHORIZED" ? (
                  <Button href={`/exams/${e.slug}/papers/${p.id}`}>
                    <Text value="View paper →" />
                  </Button>
                ) : (
                  <a
                    className="text-link"
                    href={p.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Text value="Official source ↗" />
                  </a>
                )}
              </div>
            ))}
        </div>
      )}
    </>
  );
}
