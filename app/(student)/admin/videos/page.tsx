import { requireAdmin } from "@/lib/auth";
import { Text } from "@/components/translation";
import { Heading } from "@/components/ui";
import { AdminVideoForm } from "@/components/admin";
import { db } from "@/lib/db";
export default async function Page() {
  await requireAdmin();
  const [videos, reports] = await Promise.all([
    db.video.findMany({ take: 50 }),
    db.videoReport.findMany({
      take: 30,
      include: { video: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <>
      <Heading
        eyebrow="CURATE FOR CURIOSITY"
        title="Learn Shorts moderation."
        description="Only reviewed educational videos appear in the finite student feed."
      />
      <div className="grid-2">
        <div className="card">
          <AdminVideoForm />
        </div>
        <div className="card">
          <h3>
            <Text value="Library" />
          </h3>
          {videos.map((v) => (
            <p key={v.id}>
              {v.title} · {v.youtubeId} · {v.approved ? "Approved" : "Hidden"}
            </p>
          ))}
          <h3 className="section-gap">
            <Text value="Student reports" />
          </h3>
          {reports.map((r) => (
            <p key={r.id}>
              {r.video.title}: {r.reason}
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
