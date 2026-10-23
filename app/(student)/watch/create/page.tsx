import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
import { VideoSubmissionForm } from "@/components/video-submissions";
export default async function Page() {
  const user = await requireUser();
  const submissions = await db.videoSubmission.findMany({
    where: { userId: user.id },
    select: { id: true, title: true, status: true, reviewNote: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return (
    <>
      <Heading
        eyebrow="CREATE WITH PURPOSE"
        title="One idea. A brighter mind."
        description="Record or share a short educational lesson. A moderator reviews every video before it reaches learners."
      />
      <Link className="chip" href="/watch">
        ← Back to Learn Shorts
      </Link>
      <section className="card section-gap">
        <VideoSubmissionForm />
      </section>
      <section className="card section-gap">
        <h2>Your video submissions</h2>
        {!submissions.length && <p>No videos submitted yet.</p>}
        {submissions.map((s) => (
          <article key={s.id} className="section-gap">
            <h3>{s.title}</h3>
            <p>{s.status}</p>
            {s.reviewNote && <p>Moderator: {s.reviewNote}</p>}
            <video
              className="lesson-preview"
              controls
              preload="none"
              playsInline
              src={`/api/video-submissions/${s.id}/media`}
              aria-label={`Your video: ${s.title}`}
            />
          </article>
        ))}
      </section>
    </>
  );
}
