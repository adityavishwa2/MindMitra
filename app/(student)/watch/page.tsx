import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
import { WatchFeed } from "@/components/watch";
export default async function Page() {
  await requireUser();
  const videos = await db.video.findMany({
    where: { approved: true },
    take: 20,
    orderBy: { title: "asc" },
  });
  return (
    <>
      <Heading
        eyebrow="SCROLL WITH PURPOSE"
        title="Stay a little curious."
        description="Thoughtfully curated learning breaks. A finite collection, with an easy way back."
      />
      <WatchFeed videos={videos} />
    </>
  );
}
