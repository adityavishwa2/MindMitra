import { games } from "@/lib/game-catalog";
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
        eyebrow="BRAIN ARCADE"
        title={g.name}
        description={g.description}
      />
      <GamePlayer game={g.slug} returnTo={returnTo} />
    </div>
  );
}
