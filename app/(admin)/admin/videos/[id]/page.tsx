import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
import { VideoReviewForm } from "@/components/video-submissions";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const submission = await db.videoSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      creator: true,
      category: true,
      learningObjective: true,
      status: true,
      durationSeconds: true,
      reviewNote: true,
    },
  });
  if (!submission) notFound();
  return (
    <>
      <Heading
        eyebrow="EDUCATION BEFORE PUBLICATION"
        title={submission.title}
        description={`${submission.category} · ${submission.creator} · ${Math.ceil(submission.durationSeconds)} seconds · ${submission.status}`}
      />
      <Link href="/admin/videos" className="chip">
        ← Back to video reviews
      </Link>
      <section className="card section-gap">
        <h2>1. Watch the lesson</h2>
        {submission.learningObjective && <p>{submission.learningObjective}</p>}
        <video
          controls
          playsInline
          preload="metadata"
          className="lesson-preview"
          src={`/api/video-submissions/${id}/media`}
          aria-label="Video awaiting moderation"
        />
        <p>
          Watch the full video and listen to all audio. Reject anything outside
          the educational content rules. File validation does not detect nudity
          or determine educational value.
        </p>
        {submission.reviewNote && <p>Latest review: {submission.reviewNote}</p>}
        <VideoReviewForm id={id} status={submission.status} self={false} />
      </section>
    </>
  );
}
