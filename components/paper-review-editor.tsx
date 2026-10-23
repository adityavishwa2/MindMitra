"use client";

import { useState } from "react";
import { z } from "zod";
import { importInput, questionInput } from "@/lib/validation";
import { Button } from "@/components/ui";
import { SourceQuestionImage } from "@/components/source-question-image";
import { needsCbtText } from "@/lib/cbt";

// Permit incomplete form edits; full import validation still gates saving/publication.
const editable = z.object({
  ...importInput.shape,
  marks: z.number(),
  penalty: z.number(),
  durationMinutes: z.number(),
  source: z.object({
    ...importInput.shape.source.shape,
    permissionEvidence: z.string(),
  }),
  questions: z.array(
    z.object({
      ...questionInput.shape,
      number: z.number(),
      text: z.string(),
      options: z.array(z.string()),
      subject: z.string(),
      sourcePage: z.number(),
    }),
  ),
});
type Paper = z.output<typeof editable>;
type Question = Paper["questions"][number];
export function parseReviewDraft(text: string) {
  try {
    return editable.safeParse(JSON.parse(text));
  } catch {
    return null;
  }
}

export function PaperReviewEditor({
  text,
  onChange,
  disabled = false,
  contributionId,
  onSave,
  onPublish,
  exams = [],
}: {
  text: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  contributionId?: string;
  onSave?: () => Promise<boolean>;
  onPublish?: () => void;
  exams?: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState(0);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState("");
  const parsed = parseReviewDraft(text);
  if (!parsed?.success)
    return text ? (
      <p role="alert">
        The draft cannot be shown in the visual editor. Fix its structure in
        Advanced JSON below, or load a valid paper JSON file.
      </p>
    ) : null;
  const paper = parsed.data;
  const index = Math.min(selected, Math.max(0, paper.questions.length - 1));
  const q = paper.questions[index];
  function change(patch: Partial<Paper>) {
    onChange(JSON.stringify({ ...paper, ...patch }, null, 2));
  }
  function question(patch: Partial<Question>) {
    change({
      questions: paper.questions.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }
  const noKey = {
    answer: null,
    correctAnswers: [],
    keyStatus: "UNAVAILABLE" as const,
  };
  function choose(option: number) {
    if (q.type === "MSQ") {
      const choices = new Set(q.correctAnswers);
      if (choices.has(option)) choices.delete(option);
      else choices.add(option);
      question({
        answer: null,
        correctAnswers: [...choices].sort((a, b) => a - b),
        keyStatus: choices.size ? "VERIFIED" : "UNAVAILABLE",
      });
    } else
      question({
        answer: option,
        correctAnswers: [],
        keyStatus: "VERIFIED",
      });
  }
  const validation = importInput.safeParse(paper);
  const remaining = paper.questions
    .map((item, i) => ({ item, i }))
    .filter(
      ({ item }) =>
        item.keyStatus !== "VERIFIED" ||
        !(item.type === "MSQ"
          ? item.correctAnswers.length
          : item.answer !== null),
    );
  const cbtIncomplete = paper.questions.filter(needsCbtText).length;
  const ready =
    !cbtIncomplete &&
    validation.success &&
    paper.source.permission === "AUTHORIZED" &&
    !remaining.length;
  function goToQuestion(next: number) {
    setSelected(next);
    requestAnimationFrame(() =>
      document
        .getElementById("review-current-question")
        ?.scrollIntoView({ block: "start" }),
    );
  }
  return (
    <section aria-label="Visual paper review" className="form-grid">
      <h2>Review questions and choose correct answers</h2>
      <nav className="review-steps" aria-label="Paper review steps">
        <a href="#paper-settings">1. Permission and scoring</a>
        <a href="#paper-answers">2. Check questions and answers</a>
        <a href="#paper-publish">3. Publish to practice</a>
      </nav>
      <div className="review-checklist" aria-label="Paper approval checklist">
        <strong>
          {ready
            ? "Ready to publish to practice"
            : "What is left before publication?"}
        </strong>
        <ul>
          <li>
            {paper.source.permission === "AUTHORIZED" ? (
              "✓ Reuse permission confirmed"
            ) : (
              <a href="#paper-settings">Confirm reuse permission in step 1</a>
            )}
          </li>
          <li>
            {remaining.length ? (
              <button
                type="button"
                className="text-link"
                onClick={() => goToQuestion(remaining[0].i)}
              >
                Review {remaining.length} remaining answer
                {remaining.length === 1 ? "" : "s"} — go to the first one →
              </button>
            ) : (
              "✓ Every correct answer is checked"
            )}
          </li>
          <li>
            {validation.success ? (
              "✓ Paper fields pass validation"
            ) : (
              <a href="#paper-validation">
                Fix the highlighted paper fields below
              </a>
            )}
          </li>
        </ul>
        {cbtIncomplete > 0 && (
          <p>
            {cbtIncomplete} questions need complete CBT text/options before
            publication.
          </p>
        )}
        <p>
          Save each answer as you go. When the checklist is complete, use step 3
          to publish.
        </p>
      </div>
      <p role="status">
        Answers selected:{" "}
        {
          paper.questions.filter(
            (item) =>
              item.keyStatus === "VERIFIED" &&
              (item.type === "MSQ"
                ? item.correctAnswers.length
                : item.answer !== null),
          ).length
        }{" "}
        / {paper.questions.length}
      </p>
      <p>
        Check the text, choose the correct answer, and save. Publish when the
        paper is ready for practice.
      </p>
      <p className="notice">
        Recovered questions: {paper.questions.length}. Compare this count and
        every question/option with the original PDF. OCR may omit questions or
        merge columns. Add missing questions and correct the text before
        publishing. Check the question text, options and correct answer against
        the original.
      </p>
      <fieldset id="paper-settings" disabled={disabled} className="form-grid">
        <legend>1. Permission and scoring</legend>
        {exams.length > 0 && (
          <>
            <label>
              Examination / PYQ collection
              <select
                aria-label="Examination / PYQ collection"
                value={paper.examId}
                onChange={(e) => change({ examId: e.target.value })}
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Paper year
              <input
                aria-label="Paper year"
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                value={paper.year}
                onChange={(e) => change({ year: Number(e.target.value) })}
              />
            </label>
            <label>
              Paper title
              <input
                value={paper.title}
                onChange={(e) => change({ title: e.target.value })}
              />
            </label>
            <p>
              Exam/year suggestions can be corrected here. If no exam matched,
              approval publishes to the Uploaded PYQ collection.
            </p>
          </>
        )}
        <label>
          Marks per question
          <input
            type="number"
            step="any"
            value={paper.marks}
            onChange={(e) => change({ marks: Number(e.target.value) })}
          />
        </label>
        <label>
          Penalty per wrong answer
          <input
            type="number"
            step="any"
            value={paper.penalty}
            onChange={(e) => change({ penalty: Number(e.target.value) })}
          />
        </label>
        <label>
          Duration (minutes)
          <input
            type="number"
            value={paper.durationMinutes}
            onChange={(e) =>
              change({ durationMinutes: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Reuse permission
          <select
            aria-label="Reuse permission"
            value={paper.source.permission}
            onChange={(e) =>
              change({
                source: {
                  ...paper.source,
                  permission: e.target.value as Paper["source"]["permission"],
                },
              })
            }
          >
            <option value="PENDING">Pending verification</option>
            <option value="AUTHORIZED">Authorized — evidence checked</option>
            <option value="DENIED">Denied</option>
          </select>
        </label>
        <label>
          Permission evidence
          <textarea
            aria-label="Permission evidence"
            value={paper.source.permissionEvidence}
            onChange={(e) =>
              change({
                source: { ...paper.source, permissionEvidence: e.target.value },
              })
            }
          />
        </label>
      </fieldset>
      <div id="paper-answers" />
      <h3>2. Check questions and answers</h3>
      <div className="row">
        <Button
          secondary
          disabled={disabled || index === 0}
          onClick={() => setSelected(index - 1)}
        >
          Previous review question
        </Button>
        <Button
          secondary
          disabled={disabled || index >= paper.questions.length - 1}
          onClick={() => setSelected(index + 1)}
        >
          Next review question
        </Button>
        <Button
          secondary
          disabled={disabled || paper.questions.length >= 1000}
          onClick={() => {
            change({
              questions: [
                ...paper.questions,
                {
                  number:
                    Math.max(0, ...paper.questions.map((item) => item.number)) +
                    1,
                  text: "",
                  type: "MCQ",
                  options: ["", ""],
                  subject: "Unclassified",
                  topic: "",
                  language: "en",
                  sourcePage: 1,
                  sourceRegions: [],
                  keyReference: "",
                  ...noKey,
                },
              ],
            });
            setSelected(paper.questions.length);
          }}
        >
          Add missing question
        </Button>
      </div>
      {q && (
        <>
          <label>
            Review question
            <select
              aria-label="Review question"
              value={index}
              disabled={disabled}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {paper.questions.map((item, i) => (
                <option key={i} value={i}>
                  Question {item.number} · page {item.sourcePage} ·{" "}
                  {item.keyStatus}
                </option>
              ))}
            </select>
          </label>
          <fieldset
            id="review-current-question"
            disabled={disabled}
            className="form-grid card"
          >
            <legend>
              Question {q.number} · page {q.sourcePage} · {index + 1} of{" "}
              {paper.questions.length}
            </legend>
            {!!q.sourceRegions?.length && contributionId && (
              <details className="review-source">
                <summary>Compare original question</summary>
                <SourceQuestionImage
                  key={JSON.stringify(q.sourceRegions)}
                  number={q.number}
                  url={`/api/contributions/${contributionId}/question-image?regions=${encodeURIComponent(JSON.stringify(q.sourceRegions))}`}
                />
              </details>
            )}
            {!!q.sourceRegions?.length && contributionId && (
              <Button
                secondary
                type="button"
                disabled={reading}
                onClick={async () => {
                  setReading(true);
                  setReadError("");
                  try {
                    const r = await fetch(
                      `/api/contributions/${contributionId}/ocr`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          number: q.number,
                          regions: q.sourceRegions,
                        }),
                      },
                    );
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    question({ ...d, ...noKey });
                  } catch (e) {
                    setReadError((e as Error).message);
                  } finally {
                    setReading(false);
                  }
                }}
              >
                {reading ? "Reading text…" : "Read text from PDF"}
              </Button>
            )}
            {readError && <p role="alert">{readError}</p>}
            <label>
              Question type
              <select
                aria-label="Question type"
                value={q.type}
                onChange={(e) =>
                  question({
                    type: e.target.value as Question["type"],
                    options:
                      e.target.value === "DESCRIPTIVE"
                        ? []
                        : q.options.length >= 2
                          ? q.options
                          : ["", ""],
                    ...noKey,
                  })
                }
              >
                <option value="MCQ">MCQ — one correct option</option>
                <option value="MSQ">MSQ — select all correct options</option>
                <option value="DESCRIPTIVE">Descriptive — self-assessed</option>
              </select>
            </label>
            <label>
              Question text
              <textarea
                aria-label="Question text"
                rows={4}
                value={q.text}
                onChange={(e) => question({ text: e.target.value })}
              />
            </label>
            <details>
              <summary>Question settings</summary>
              <label>
                Original question number
                <input
                  type="number"
                  value={q.number}
                  onChange={(e) => question({ number: Number(e.target.value) })}
                />
              </label>
              <label>
                Subject
                <input
                  value={q.subject}
                  onChange={(e) => question({ subject: e.target.value })}
                />
              </label>
              <label>
                Topic
                <input
                  value={q.topic}
                  onChange={(e) => question({ topic: e.target.value })}
                />
              </label>
              <label>
                Source page
                <input
                  type="number"
                  value={q.sourcePage}
                  onChange={(e) =>
                    question({ sourcePage: Number(e.target.value) })
                  }
                />
              </label>
              <Button
                type="button"
                secondary
                disabled={q.options.length <= 2}
                onClick={() =>
                  question({ options: q.options.slice(0, -1), ...noKey })
                }
              >
                Remove last option
              </Button>
              <label>
                Question language
                <select
                  aria-label="Question language"
                  value={q.language}
                  onChange={(e) =>
                    question({ language: e.target.value as "en" | "hi" })
                  }
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </label>
            </details>
            {q.type !== "DESCRIPTIVE" && (
              <>
                <p>
                  {q.type === "MSQ"
                    ? "Select every correct option. Scoring requires an exact match."
                    : "Select the one correct option."}{" "}
                </p>
                {q.options.map((option, i) => (
                  <div className="cbt-option-editor" key={i}>
                    <label className="task-row">
                      <input
                        type={q.type === "MSQ" ? "checkbox" : "radio"}
                        name="review-correct-answer"
                        aria-label={`Correct option ${String.fromCharCode(65 + i)}`}
                        checked={
                          q.type === "MSQ"
                            ? q.correctAnswers.includes(i)
                            : q.answer === i
                        }
                        onChange={() => choose(i)}
                      />
                      {String.fromCharCode(65 + i)}
                    </label>
                    <label>
                      Option {String.fromCharCode(65 + i)}
                      <textarea
                        rows={2}
                        aria-label={`Option ${String.fromCharCode(65 + i)}`}
                        value={option}
                        onChange={(e) =>
                          question({
                            options: q.options.map((value, j) =>
                              i === j ? e.target.value : value,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
                <details>
                  <summary>Option controls and answer status</summary>
                  <Button
                    secondary
                    disabled={q.options.length >= 8}
                    onClick={() =>
                      question({ options: [...q.options, ""], ...noKey })
                    }
                  >
                    Add option
                  </Button>
                  <label>
                    Answer-key status
                    <select
                      aria-label="Answer-key status"
                      value={q.keyStatus}
                      onChange={(e) =>
                        question(
                          e.target.value === "UNAVAILABLE"
                            ? noKey
                            : {
                                keyStatus: e.target
                                  .value as Question["keyStatus"],
                              },
                        )
                      }
                    >
                      <option value="UNAVAILABLE">
                        Unavailable — not scored
                      </option>
                      <option value="VERIFIED">Correct answer checked</option>
                      <option value="DISPUTED">Disputed — not scored</option>
                    </select>
                  </label>
                  <Button secondary onClick={() => question(noKey)}>
                    Clear correct answers
                  </Button>
                </details>
              </>
            )}
            {onSave && (
              <Button
                disabled={disabled || !validation.success}
                onClick={async () => {
                  if (await onSave()) {
                    setSelected(
                      Math.min(paper.questions.length - 1, index + 1),
                    );
                    requestAnimationFrame(() =>
                      document
                        .getElementById("review-current-question")
                        ?.scrollIntoView({ block: "start" }),
                    );
                  }
                }}
              >
                Save answer &amp; next
              </Button>
            )}
            {onPublish && (
              <>
                <h3 id="paper-publish">3. Publish to practice</h3>
                <Button disabled={disabled || !ready} onClick={onPublish}>
                  Finish review and publish to practice
                </Button>
                <p>
                  {ready
                    ? "Publishing makes this paper available in exam preparation. You do not need to import JSON separately."
                    : `Still needed: ${cbtIncomplete ? `${cbtIncomplete} complete CBT question texts/options. ` : ""}${remaining.length ? `${remaining.length} verified answers. ` : ""}${paper.source.permission !== "AUTHORIZED" ? "Reuse permission confirmation. " : ""}${!validation.success ? "Fix the paper fields listed below." : ""}`}
                </p>
              </>
            )}
            <details>
              <summary>Optional explanation and question removal</summary>
              <label>
                Answer explanation
                <textarea
                  aria-label="Answer explanation"
                  value={q.explanation ?? ""}
                  onChange={(e) => question({ explanation: e.target.value })}
                />
              </label>
              <Button
                secondary
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove question ${q.number} from this draft?`,
                    )
                  )
                    change({
                      questions: paper.questions.filter((_, i) => i !== index),
                    });
                }}
              >
                Remove this question
              </Button>
            </details>
          </fieldset>
        </>
      )}
      {!validation.success && (
        <div role="status" id="paper-validation">
          <p>Before saving or publishing, fix:</p>
          <ul>
            {validation.error.issues.slice(0, 8).map((issue, i) => (
              <li key={i}>
                {issue.path.join(" → ")}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
