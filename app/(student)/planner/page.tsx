import { Text } from "@/components/translation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Heading, EmptyState } from "@/components/ui";
import { TaskForm, TaskCheck } from "@/components/forms";
export default async function Page() {
  const u = await requireUser();
  const tasks = await db.studyTask.findMany({
    where: { userId: u.id },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }],
    take: 200,
  });
  return (
    <>
      <Heading
        eyebrow="MAKE ROOM FOR A LITTLE PROGRESS"
        title="Your day, at your pace."
        description="A plan is a helping hand. Change it, skip a day, start again. This space is yours."
      />
      <div className="grid-2">
        <section className="card">
          <h3>
            <Text value="One small step" />
          </h3>
          <TaskForm />
        </section>
        <section className="card">
          <h3>
            <Text value="Your study plan" />
          </h3>
          {tasks.length ? (
            tasks.map((t) => (
              <div key={t.id}>
                <small className="muted">
                  {t.dueDate.toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "numeric",
                    month: "short",
                  })}
                </small>
                <TaskCheck {...t} />
              </div>
            ))
          ) : (
            <EmptyState title="A little space for your goals">
              <Text value="Add a task, set a date, and take it one step at a time." />
            </EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
