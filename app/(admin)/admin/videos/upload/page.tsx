import { requireAdmin } from "@/lib/auth";
import { Heading } from "@/components/ui";
import { VideoSubmissionForm } from "@/components/video-submissions";
export default async function Page() {
  await requireAdmin();
  return (
    <>
      <Heading
        eyebrow="CREATE · REVIEW · PUBLISH"
        title="Give an idea its moment."
        description="Upload or record an educational short. Next, review your own lesson and publish it to Learn Shorts."
      />
      <p className="notice">
        Your public creator name is MindMitra Educators. Your administrator name
        and email are private.
      </p>
      <section className="card">
        <VideoSubmissionForm admin />
      </section>
    </>
  );
}
