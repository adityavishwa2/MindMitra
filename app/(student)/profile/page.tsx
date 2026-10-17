import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading } from "@/components/ui";
import { ProfileForm } from "@/components/forms";
export default async function Page() {
  const u = await requireUser();
  const exams = await db.exam.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <Heading
        eyebrow="A SPACE THAT’S YOURS"
        title="Your learning profile."
        description={`Member since ${u.createdAt.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}. Private by default.`}
      />
      {u.image &&
        /^https:\/\/[^/]*\.googleusercontent\.com\//.test(u.image) && (
          <div className="row" style={{ marginBottom: 24 }}>
            <Image
              src={u.image}
              alt="Your Google profile photograph"
              width={72}
              height={72}
              style={{ borderRadius: "50%" }}
            />
            <div>
              <strong>{u.name}</strong>
              <p>{u.email}</p>
            </div>
          </div>
        )}
      <div className="card" style={{ maxWidth: 720 }}>
        <ProfileForm
          exams={exams}
          initial={{
            name: u.name ?? "Student",
            language: u.language as "en" | "hi",
            dailyGoal: u.dailyGoal,
            targetExams: u.targetExams,
            reminder: u.reminder,
            targetDate: u.targetDate?.toISOString().slice(0, 10) ?? null,
          }}
        />
      </div>
    </>
  );
}
