import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/forms";
import { Heading } from "@/components/ui";
import { redirect } from "next/navigation";
export default async function Page() {
  const u = await requireUser();
  if (u.onboarded) redirect("/dashboard");
  const exams = await db.exam.findMany({ orderBy: { name: "asc" } });
  return (
    <div style={{ maxWidth: 650, margin: "auto" }}>
      <Heading
        eyebrow="LET’S MAKE THIS YOURS"
        title="Every journey has a first step."
        description="A few preferences will help shape your learning space. You can change them anytime."
      />
      <div className="card">
        <ProfileForm
          onboarding
          initial={{
            name: u.name ?? "Student",
            language: u.language as "en" | "hi",
            dailyGoal: u.dailyGoal,
            targetExams: u.targetExams,
            reminder: u.reminder,
            targetDate: null,
          }}
          exams={exams}
        />
      </div>
    </div>
  );
}
