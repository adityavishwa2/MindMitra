"use client";
import { Text } from "@/components/translation";

import { QuestionContent } from "@/components/question-content";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "./ui";
type Q = {
  id: string;
  number: number;
  text: string;
  type: string;
  options: string[];
  subject: string;
  sourcePage: number;
};
type A = { selected: number | null; reviewed: boolean; text?: string };
export function Quiz({
  id,
  questions,
  initialAnswers,
  initialCurrent,
  mode,
  startedAt,
  durationMinutes,
  initialElapsed,
  initialBookmarks = [],
}: {
  id: string;
  questions: Q[];
  initialAnswers: Record<string, A>;
  initialCurrent: number;
  mode: string;
  startedAt: string;
  durationMinutes: number;
  initialElapsed: number;
  initialBookmarks?: string[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initialCurrent);
  const [answers, setAnswers] = useState(initialAnswers);
  const [message, setMessage] = useState("All changes saved");
  const [seconds, setSeconds] = useState(initialElapsed);
  const [busy, setBusy] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  const [marks, setMarks] = useState(() => new Set(initialBookmarks));
  const busyRef = useRef(false);
  const positionHydrated = useRef(false);
  const pending = useRef<Record<string, A>>({});
  const q = questions[current];
  const bookmarked = marks.has(q.id);
  const answer = answers[q.id] ?? { selected: null, reviewed: false, text: "" };
  useEffect(() => {
    if (!positionHydrated.current) return;
    localStorage.setItem(`mm-position-${id}`, String(current));
    void api(`position/${id}`, { current }).catch(() => {});
  }, [id, current]);
  const flush = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      for (const [questionId, a] of Object.entries(pending.current)) {
        await api(`answer/${id}`, { questionId, ...a, current });
        if (pending.current[questionId] === a)
          delete pending.current[questionId];
      }
      localStorage.setItem(`mm-quiz-${id}`, JSON.stringify(pending.current));
      if (!Object.keys(pending.current).length) setMessage("All changes saved");
    } catch {
      setMessage("Waiting to sync. Your answer is saved on this device.");
    } finally {
      busyRef.current = false;
    }
  }, [id, current]);
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(`mm-quiz-${id}`) ?? "{}");
      pending.current = cached;
      positionHydrated.current = true;
      const storedPosition = localStorage.getItem(`mm-position-${id}`);
      const position = storedPosition === null ? -1 : Number(storedPosition);
      queueMicrotask(() => {
        setAnswers((a) => ({ ...a, ...cached }));
        if (
          Number.isInteger(position) &&
          position >= 0 &&
          position < questions.length
        )
          setCurrent(position);
      });
    } catch {}
  }, [id, questions.length]);
  useEffect(() => {
    void api(`heartbeat/${id}`, { reset: true }).catch(() => {});
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible")
        void api(`heartbeat/${id}`, { reset: false }).catch(() => {});
    }, 10000);
    const t = setInterval(() => {
      if (mode === "timed")
        setSeconds(
          Math.max(
            0,
            Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
          ),
        );
      else if (document.visibilityState === "visible") setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(t);
      clearInterval(heartbeat);
    };
  }, [startedAt, mode, id]);
  useEffect(() => {
    if (mode !== "timed" && seconds >= 1800)
      queueMicrotask(() => setShowBreak(true));
  }, [seconds, mode]);
  useEffect(() => {
    const t = setInterval(() => void flush(), 2000);
    const sync = () => void flush();
    window.addEventListener("online", sync);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", sync);
    };
  }, [flush]);
  const submit = useCallback(
    async (deadline = false) => {
      setBusy(true);
      try {
        if (!deadline) await flush();
        if (!deadline && Object.keys(pending.current).length)
          throw new Error(
            "Reconnect and wait for your answers to sync before submitting.",
          );
        await api(`submit/${id}`, {});
        localStorage.removeItem(`mm-quiz-${id}`);
        localStorage.removeItem(`mm-position-${id}`);
        router.push(`/practice/${id}/results`);
      } catch (e) {
        setMessage((e as Error).message);
        setBusy(false);
      }
    },
    [flush, id, router],
  );
  useEffect(() => {
    if (mode === "timed" && seconds >= durationMinutes * 60 && !busy)
      queueMicrotask(() => void submit(true));
  }, [mode, seconds, durationMinutes, busy, submit]);
  function update(a: A) {
    setAnswers((v) => ({ ...v, [q.id]: a }));
    pending.current[q.id] = a;
    localStorage.setItem(`mm-quiz-${id}`, JSON.stringify(pending.current));
    setMessage("Saving…");
    void flush();
  }
  const time =
    mode === "timed" ? Math.max(0, durationMinutes * 60 - seconds) : seconds;
  return (
    <>
      <div className="spread" style={{ marginBottom: 20 }}>
        <span className="badge">
          {mode === "timed" ? "EXAM SIMULATION" : "AT YOUR OWN PACE"}
        </span>
        <span className="timer">
          {Math.floor(time / 60)}:{String(time % 60).padStart(2, "0")}
        </span>
      </div>
      {showBreak && mode !== "timed" && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <div>
            <Text value="You’ve been working hard! How about a five-minute brain break?" />
            <div className="row section-gap">
              <Button
                href={`/games?returnTo=${encodeURIComponent(`/practice/${id}`)}`}
              >
                <Text value="Play a quick game" />
              </Button>
              <Button secondary onClick={() => setShowBreak(false)}>
                <Text value="Continue studying" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="quiz-layout">
        <section className="card">
          <div className="spread">
            <span className="muted">
              <Text value="Question" />
              {current + 1}
              <Text value="of" />
              {questions.length}
            </span>
            <span className="badge">{q.subject}</span>
          </div>
          <div className="progress-track section-gap">
            <span
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>
          <h2
            style={{
              fontSize: 23,
              marginTop: 30,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            <QuestionContent text={q.text} />
          </h2>
          {q.type === "DESCRIPTIVE" ? (
            <label>
              <Text value="Your response (self-assessed)" />
              <textarea
                value={answer.text ?? ""}
                onChange={(e) => update({ ...answer, text: e.target.value })}
              />
            </label>
          ) : (
            <div className="question-options">
              {q.options.map((option, i) => (
                <button
                  key={i}
                  className={`option ${answer.selected === i ? "selected" : ""}`}
                  aria-pressed={answer.selected === i}
                  onClick={() => update({ ...answer, selected: i })}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          )}
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button
              className="chip"
              onClick={() => update({ ...answer, selected: null, text: "" })}
            >
              <Text value="Clear response" />
            </button>
            <button
              className={`chip ${answer.reviewed ? "active" : ""}`}
              onClick={() => update({ ...answer, reviewed: !answer.reviewed })}
            >
              ⚑ {answer.reviewed ? "Marked for review" : "Mark for review"}
            </button>
            <button
              className="chip"
              onClick={async () => {
                try {
                  await api("bookmark", {
                    questionId: q.id,
                    saved: !bookmarked,
                  });
                  setMarks((old) => {
                    const next = new Set(old);
                    if (bookmarked) next.delete(q.id);
                    else next.add(q.id);
                    return next;
                  });
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              {bookmarked ? "★ Saved" : "☆ Bookmark"}
            </button>
          </div>
          <p className="muted section-gap" style={{ fontSize: 10 }}>
            <Text value="Original question" />
            {q.number}
            <Text value="· source page" />
            {q.sourcePage}
            <Text value=". Original wording is preserved." />
          </p>
          <p aria-live="polite" style={{ fontSize: 11 }}>
            {message}
          </p>
          <div className="quiz-bottom">
            <Button
              secondary
              disabled={current === 0}
              onClick={() => {
                setCurrent(current - 1);
              }}
            >
              <Text value="← Previous" />
            </Button>
            {current < questions.length - 1 ? (
              <Button
                onClick={() => {
                  setCurrent(current + 1);
                }}
              >
                <Text value="Next question →" />
              </Button>
            ) : (
              <Button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Submit this paper? Your answers will be final.",
                    )
                  )
                    void submit();
                }}
              >
                {busy ? "Submitting…" : "Submit paper"}
              </Button>
            )}
          </div>
        </section>
        <aside className="card">
          <h3 style={{ fontSize: 16 }}>
            <Text value="Your paper" />
          </h3>
          <div className="question-nav">
            {questions.map((q, i) => (
              <button
                key={q.id}
                aria-label={`Go to question ${i + 1}`}
                className={`${i === current ? "current" : ""} ${answers[q.id]?.selected != null || answers[q.id]?.text ? "answered" : ""} ${answers[q.id]?.reviewed ? "review" : ""}`}
                onClick={() => {
                  setCurrent(i);
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, marginTop: 20 }}>
            <Text value="Green: answered · Apricot: review" />
          </p>
          <Button
            secondary
            disabled={busy}
            onClick={() => {
              if (window.confirm("Submit your saved answers?")) void submit();
            }}
          >
            <Text value="Submit paper" />
          </Button>
          {mode !== "timed" && (
            <Link
              className="text-link section-gap"
              href={`/games?returnTo=${encodeURIComponent(`/practice/${id}`)}`}
            >
              <Text value="Take a brain break ↗" />
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
