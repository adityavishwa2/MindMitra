import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateVideoButton } from "@/components/video-submissions";
import { WatchFeed } from "@/components/watch";
export default async function Page() {
  const user = await requireUser();
  const videos = await db.video.findMany({
    where: { approved: true },
    include: {
      submission: {
        select: { id: true, status: true, user: { select: { role: true } } },
      },
      likes: { where: { userId: user.id }, select: { userId: true } },
      bookmarks: { where: { userId: user.id }, select: { userId: true } },
      _count: { select: { likes: true } },
    },
    take: 20,
    orderBy: { title: "asc" },
  });
  return (
    <>
      <header className="shorts-page-header">
        <div>
          <span className="eyebrow">LEARN · WATCH · GROW</span>
          <h1>Learn Shorts</h1>
        </div>
        <CreateVideoButton />
      </header>
      <WatchFeed
        videos={videos
          .filter((v) => v.youtubeId || v.submission?.status === "APPROVED")
          .map((v) => ({
            id: v.id,
            title: v.title,
            creator:
              v.submission?.user.role === "ADMIN"
                ? "MindMitra Educators"
                : v.creator,
            category: v.category,
            youtubeId: v.youtubeId,
            liked: !!v.likes.length,
            likeCount: v._count.likes,
            saved: !!v.bookmarks.length,
            mediaUrl: v.submission
              ? `/api/video-submissions/${v.submission.id}/media`
              : null,
          }))}
      />
    </>
  );
}
