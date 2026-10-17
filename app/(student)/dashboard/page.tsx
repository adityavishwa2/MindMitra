import { Text } from "@/components/translation";
import Link from "next/link";
import { BookOpen, Gamepad2, Play, ArrowUpRight, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { analytics } from "@/lib/analytics";
import { Button, FeatureCard, EmptyState } from "@/components/ui";
import { TaskCheck } from "@/components/forms";
export default async function Page() {
  const u = await requireUser();
  const [a, tasks, last, goal] = await Promise.all([
    analytics(u.id),
    db.studyTask.findMany({
      where: { userId: u.id, done: false },
      take: 3,
      orderBy: { dueDate: "asc" },
    }),
    db.practiceSession.findFirst({
      where: { userId: u.id, submittedAt: null },
      include: { paper: { include: { exam: true } } },
      orderBy: { startedAt: "desc" },
    }),
    u.targetExams[0]
      ? db.exam.findUnique({ where: { id: u.targetExams[0] } })
      : null,
  ]);
  const hi = u.language === "hi";
  return (
    <>
      <div className="spread page-heading">
        <div>
          <span className="eyebrow">
            {new Date().toLocaleDateString(hi ? "hi-IN" : "en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Asia/Kolkata",
            })}
          </span>
          <h1>
            {hi ? "नमस्ते" : "Hello"}, {u.name?.split(" ")[0] ?? "learner"}{" "}
            <span style={{ fontSize: 27 }}>☀</span>
          </h1>
          <p>
            {hi
              ? "आज एक छोटा कदम आगे बढ़ाएँ।"
              : "A fresh day. A little learning. A step closer to your goals."}
          </p>
        </div>
        <span className="pill">
          ✦ {a.streak} {hi ? "दिन की निरंतरता" : "day study streak"}
        </span>
      </div>
      <section className="welcome-panel">
        <div>
          <span className="eyebrow">
            {goal?.name ??
              (hi ? "आपकी सीखने की यात्रा" : "YOUR LEARNING JOURNEY")}
          </span>
          <h2>
            {hi ? "बड़े सपने। छोटे कदम।" : "Big dreams start with small steps."}
          </h2>
          <p>
            {hi
              ? `आज का लक्ष्य: ${u.dailyGoal} प्रश्न। अपनी गति से आगे बढ़ें।`
              : `Your goal is ${u.dailyGoal} questions a day. Take your time, find your focus, and make a little room for progress.`}
          </p>
          <div className="row">
            <Button href={last ? `/practice/${last.id}` : "/exams"}>
              {last ? "Continue practice" : "Explore exam papers"}{" "}
              <ArrowUpRight size={16} />
            </Button>
            <Link className="text-link" href="/planner">
              <Text value="Set your study plan →" />
            </Link>
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          ✦<br />▱
        </div>
      </section>
      {u.reminder && (
        <p className="notice section-gap">
          <Text value="Your gentle reminder: make a little time for your study goal today." />
        </p>
      )}
      <section className="metrics">
        {[
          [
            hi ? "प्रयास किए प्रश्न" : "Unique questions",
            a.unique,
            "Verified PYQs attempted",
          ],
          [
            hi ? "सटीकता" : "Your accuracy",
            a.accuracy === null ? "—" : a.accuracy + "%",
            "Scorable answers only",
          ],
          [
            hi ? "अध्ययन समय" : "Practice time",
            Math.floor(a.seconds / 60) + "m",
            "Recorded session time",
          ],
          [
            hi ? "पूर्ण पेपर" : "Completed papers",
            a.completedPapers,
            "Within the verified collection",
          ],
        ].map(([label, value, foot]) => (
          <div className="card metric" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span className="metric-foot">{foot}</span>
          </div>
        ))}
      </section>
      <div className="dashboard-grid">
        <div className="card">
          <div className="panel-title">
            <h3>
              <Text value="Pick up where you left off" />
            </h3>
            <Link href="/exams">
              <Text value="All examinations ↗" />
            </Link>
          </div>
          {last ? (
            <>
              <span className="badge">
                <Text value="IN PROGRESS" />
              </span>
              <h3 className="section-gap">{last.paper.exam.name}</h3>
              <p>
                {last.paper.year} · {last.paper.stage} · {last.paper.shift}
              </p>
              <Button href={`/practice/${last.id}`}>
                <Text value="Resume question" />
                {last.current + 1} →
              </Button>
            </>
          ) : (
            <EmptyState title="Your next chapter is waiting">
              <Text value="Choose an exam to explore its verified paper availability. Your practice will appear here once you begin." />
            </EmptyState>
          )}
        </div>
        <div className="card">
          <div className="panel-title">
            <h3>
              <Text value="One step at a time" />
            </h3>
            <Link href="/planner">
              <Text value="My planner ↗" />
            </Link>
          </div>
          {tasks.length ? (
            tasks.map((t) => <TaskCheck key={t.id} {...t} />)
          ) : (
            <>
              <span className="icon-box">
                <Sparkles size={23} />
              </span>
              <h3 className="section-gap">
                <Text value="Make today feel achievable." />
              </h3>
              <p>
                <Text value="Start with one small study task. You can always build from there." />
              </p>
              <Button href="/planner" secondary>
                <Text value="Create a small goal +" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="section-gap">
        <div className="panel-title">
          <h3>
            <Text value="A little balance for your day" />
          </h3>
          <span className="muted" style={{ fontSize: 10 }}>
            <Text value="LEARN → PLAY → GROW" />
          </span>
        </div>
        <div className="grid-3">
          <FeatureCard
            icon={<BookOpen />}
            title="Find your next paper"
            text="Your examination goals, organized into a clearer path."
            href="/exams"
          />
          <FeatureCard
            icon={<Gamepad2 />}
            title="A well-earned brain break"
            text="A quick memory game. A fresh perspective. Back to you."
            href="/games"
            color="peach"
          />
          <FeatureCard
            icon={<Play />}
            title="Stay a little curious"
            text="A finite collection of curated educational videos."
            href="/watch"
            color="green"
          />
        </div>
      </div>
      <p
        className="section-gap muted"
        style={{ fontSize: 11, textAlign: "center" }}
      >
        <Text value="“Small progress, repeated consistently, leads to meaningful results.”" />
      </p>
    </>
  );
}
