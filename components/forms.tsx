"use client";
import { Text } from "@/components/translation";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { profileInput } from "@/lib/validation";
import { Button } from "./ui";
import { useLocale } from "./providers";
import Link from "next/link";
import { signOut } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
type Profile = z.infer<typeof profileInput>;
export function ProfileForm({
  initial,
  exams,
  onboarding = false,
}: {
  initial: Profile;
  exams: { id: string; name: string }[];
  onboarding?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Profile>({
    resolver: zodResolver(profileInput),
    defaultValues: initial,
  });
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { t, setLanguage } = useLocale();
  async function save(d: Profile) {
    try {
      await api("profile", d);
      setLanguage(d.language);
      setMessage(t("Preferences saved.", "प्राथमिकताएँ सहेजी गईं।"));
      if (onboarding) router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <form className="form-grid" onSubmit={handleSubmit(save)}>
      {onboarding && (
        <>
          <div className="onboarding-steps">
            {[0, 1, 2].map((n) => (
              <span key={n} className={step >= n ? "active" : ""} />
            ))}
          </div>
          <span className="eyebrow">
            <Text value="STEP" />
            {step + 1}
            <Text value="OF 3" />
          </span>
        </>
      )}
      {(!onboarding || step === 0) && (
        <>
          <label>
            {t("What should we call you?", "हम आपको क्या कहें?")}
            <input {...register("name")} />
          </label>
          <label>
            {t("Interface language", "इंटरफ़ेस भाषा")}
            <select {...register("language")}>
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </label>
        </>
      )}
      {(!onboarding || step === 1) && (
        <label>
          {t("Your target examinations", "आपकी लक्षित परीक्षाएँ")}
          <select multiple size={6} {...register("targetExams")}>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <small className="muted">
            <Text value="Choose up to 10. Your first selection is your primary goal. Use Ctrl/⌘ to select several." />
          </small>
        </label>
      )}
      {(!onboarding || step === 2) && (
        <>
          <label>
            {t("Daily question goal", "दैनिक प्रश्न लक्ष्य")}
            <input
              type="number"
              min="1"
              max="500"
              {...register("dailyGoal", { valueAsNumber: true })}
            />
          </label>
          <label>
            {t("Target exam date (optional)", "परीक्षा की तारीख (वैकल्पिक)")}
            <input type="date" {...register("targetDate")} />
          </label>
          <label className="row">
            <input
              style={{ width: 18, minHeight: 18 }}
              type="checkbox"
              {...register("reminder")}
            />
            <Text value="Show study reminder in dashboard" />
          </label>
        </>
      )}
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="error-text">
          <Text value="Check your name, targets, and daily goal (1–500)." />
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="row">
        {onboarding && step > 0 && (
          <Button type="button" secondary onClick={() => setStep(step - 1)}>
            <Text value="Back" />
          </Button>
        )}
        {onboarding && step < 2 ? (
          <Button type="button" onClick={() => setStep(step + 1)}>
            <Text value="Continue →" />
          </Button>
        ) : (
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Saving…"
              : t("Save and continue", "सहेजें और जारी रखें")}
          </Button>
        )}
        {onboarding && (
          <Button type="button" secondary onClick={() => save(initial)}>
            <Text value="Skip for now" />
          </Button>
        )}
      </div>
    </form>
  );
}
export function TaskForm() {
  const [title, setTitle] = useState("");
  const [dueDate, setDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
  );
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api("tasks", { title, dueDate: dueDate + "T12:00:00+05:30" });
          setTitle("");
          setError("");
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <label>
        <Text value="What’s your next small step?" />
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Revise ratios for 20 minutes"
        />
      </label>
      <label>
        <Text value="Plan it for" />
        <input
          required
          type="date"
          value={dueDate}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <Button>
        <Text value="Add to my plan +" />
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
export function TaskCheck({
  id,
  done,
  title,
  dueDate,
}: {
  id: string;
  done: boolean;
  title: string;
  dueDate?: Date;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <label className={`task-row ${done ? "done" : ""}`}>
        <input
          type="checkbox"
          checked={done}
          onChange={async (e) => {
            try {
              await api(`task/${id}`, { done: e.target.checked });
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        <span>{title}</span>
      </label>
      <TaskActions id={id} title={title} dueDate={dueDate} />
      {error && <p role="alert">{error}</p>}
    </>
  );
}
function TaskActions({
  id,
  title,
  dueDate,
}: {
  id: string;
  title: string;
  dueDate?: Date;
}) {
  const router = useRouter();
  const [value, setValue] = useState(title);
  const [date, setDate] = useState(
    dueDate
      ? new Date(dueDate).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        })
      : "",
  );
  const [message, setMessage] = useState("");
  async function save() {
    try {
      await api(`task/${id}`, {
        title: value,
        ...(date ? { dueDate: date + "T12:00:00+05:30" } : {}),
      });
      setMessage("Saved");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function remove() {
    if (!window.confirm("Remove this task from your plan?")) return;
    try {
      await api(`task-delete/${id}`, {});
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <details style={{ fontSize: 11, padding: "5px 0 12px" }}>
      <summary>
        <Text value="Edit or reschedule" />
      </summary>
      <div className="form-grid section-gap">
        <label>
          <Text value="Task" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={200}
          />
        </label>
        <label>
          <Text value="Date" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="row">
          <Button secondary onClick={save}>
            <Text value="Save changes" />
          </Button>
          <Button secondary onClick={remove}>
            <Text value="Remove task" />
          </Button>
        </div>
        <p role="status">{message}</p>
      </div>
    </details>
  );
}
export function PracticeButton({
  paperId,
  subjects = [],
  topics = [],
}: {
  paperId: string;
  subjects?: string[];
  topics?: string[];
}) {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [selection, setSelection] = useState("all");
  const [limit, setLimit] = useState(1000);
  const [mode, setMode] = useState("untimed");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="form-grid">
      <label>
        <Text value="Practice at your pace" />
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="untimed">
            <Text value="Untimed practice" />
          </option>
          <option value="timed">
            <Text value="Timed full paper" />
          </option>
        </select>
      </label>
      {mode !== "timed" && (
        <>
          <label>
            <Text value="Subject" />
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">
                <Text value="All subjects" />
              </option>
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <Text value="Topic" />
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">
                <Text value="All topics" />
              </option>
              {topics.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <Text value="Revision selection" />
            <select
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
            >
              <option value="all">
                <Text value="All available questions" />
              </option>
              <option value="incorrect">
                <Text value="Previously incorrect answers" />
              </option>
              <option value="bookmarked">
                <Text value="My bookmarks" />
              </option>
              <option value="unsolved">
                <Text value="Not yet attempted" />
              </option>
            </select>
          </label>
          <label>
            <Text value="Question limit" />
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={1000}>
                <Text value="Whole selection" />
              </option>
              <option value={10}>
                <Text value="A 10-question challenge" />
              </option>
              <option value={20}>
                <Text value="20 questions" />
              </option>
              <option value={50}>
                <Text value="50 questions" />
              </option>
            </select>
          </label>
        </>
      )}
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const s = await api("practice", {
              paperId,
              mode,
              subject,
              topic,
              selection,
              limit,
            });
            router.push(`/practice/${s.id}`);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <Text value="Start practice →" />
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function AccountActions() {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="form-grid">
      <Link
        download
        prefetch={false}
        className="button secondary"
        href="/api/export"
      >
        <Text value="Export my account data (JSON)" />
      </Link>
      <Button
        secondary
        onClick={async () => {
          await api("logout-all", {});
          await signOut({ callbackUrl: "/" });
        }}
      >
        <Text value="Sign out of all devices" />
      </Button>
      <Dialog.Root>
        <Dialog.Trigger className="button secondary">
          <Text value="Delete my account" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: "fixed",
              inset: 0,
              background: "#0008",
              zIndex: 60,
            }}
          />
          <Dialog.Content
            className="card"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 61,
              width: "min(90vw,450px)",
            }}
          >
            <Dialog.Title>
              <Text value="Delete your account?" />
            </Dialog.Title>
            <Dialog.Description>
              <Text value="This permanently removes your profile, private practice records, tasks, game scores, and watch history. Type DELETE to confirm." />
            </Dialog.Description>
            <input
              aria-label="Type DELETE to confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
            <div className="controls">
              <Dialog.Close className="button secondary">
                <Text value="Keep my account" />
              </Dialog.Close>
              <Button
                disabled={confirmation !== "DELETE"}
                onClick={async () => {
                  try {
                    await api("delete-account", { confirmation });
                    await signOut({ callbackUrl: "/" });
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Text value="Permanently delete" />
              </Button>
            </div>
            {error && <p role="alert">{error}</p>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export function FavoriteExam({ id, saved }: { id: string; saved: boolean }) {
  const [active, setActive] = useState(saved);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="icon-button"
        aria-label={active ? "Remove favorite exam" : "Favorite exam"}
        aria-pressed={active}
        onClick={async (e) => {
          e.preventDefault();
          try {
            await api("exam-favorite", { examId: id, saved: !active });
            setActive(!active);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        {active ? "★" : "☆"}
      </button>
      {error && <small role="alert">{error}</small>}
    </>
  );
}
