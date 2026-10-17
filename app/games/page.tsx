import { Text } from "@/components/translation";
import Link from "next/link";
import { games } from "@/lib/game-catalog";
import { Heading } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <>
      <Heading
        eyebrow="A LITTLE PLAY. A FRESH PERSPECTIVE."
        title="Brain Arcade"
        description="Recharge your mind. Find your flow. No pressure, just a little joy."
      />
      <div className="welcome-panel" style={{ marginBottom: 26 }}>
        <div>
          <span className="eyebrow">
            <Text value="YOUR FIVE-MINUTE RESET" />
          </span>
          <h2>
            <Text value="A break can be a step forward." />
          </h2>
          <p>
            <Text value="Your study goals will be here when you get back. Pick something that feels good." />
          </p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          ✿
        </div>
      </div>
      <div className="grid-3">
        {games.map((g) => (
          <Link
            key={g.slug}
            href={`/games/${g.slug}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            className="card game-card"
          >
            <div className={`game-cover ${g.color}`}>
              {g.art.map((s, i) => (
                <span className={/^\d+$/.test(s) ? "number-tile" : ""} key={i}>
                  {s}
                </span>
              ))}
            </div>
            <div className="game-body">
              <div className="spread">
                <span className="eyebrow" style={{ margin: 0, fontSize: 8 }}>
                  {g.tag}
                </span>
                <span className="muted" style={{ fontSize: 10 }}>
                  {g.minutes}
                </span>
              </div>
              <h3>{g.name}</h3>
              <p>{g.description}</p>
              <span className="text-link">
                <Text value="Let’s play" />
                <span>↗</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="notice section-gap">
        <Text value="A healthy break has a gentle ending. After five minutes, we’ll offer a reminder to return to your learning. You’re always in control." />
      </div>
    </>
  );
}
