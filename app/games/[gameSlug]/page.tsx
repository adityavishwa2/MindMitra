import { games } from "@/lib/game-catalog";
import { MindBreak } from "@/components/mind-break";
import { GamePlayer } from "@/components/game-player";
import { Heading } from "@/components/ui";
import { notFound } from "next/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { gameSlug } = await params;
  const { returnTo } = await searchParams;
  const g = games.find((g) => g.slug === gameSlug);
  if (!g) notFound();
  return (
    <div style={{ maxWidth: 740, margin: "auto" }}>
      <Heading
        eyebrow="MIND BREAK"
        title={g.name}
        description={g.description}
      />
      {["paper-toss", "bridge-builder", "paper-football"].includes(g.slug) ? (
        <MindBreak key={g.slug} game={g.slug} returnTo={returnTo} />
      ) : (
        <GamePlayer game={g.slug} returnTo={returnTo} />
      )}
    </div>
  );
}
