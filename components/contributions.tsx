"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { PaperReviewEditor } from "@/components/paper-review-editor";
import { MAX_JSON_BYTES, paperFileLimit } from "@/lib/upload-limits";
export function ContributionForm({
  adminUpload = false,
}: {
  exams?: { id: string; name: string }[];
  alias?: string;
  adminUpload?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (
      !(file instanceof File) ||
      !file.name.toLowerCase().endsWith(".pdf") ||
      !file.size ||
      file.size > paperFileLimit(file.name)
    ) {
      setMessage("Choose a PDF up to 20 MB.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Unable to upload PDF");
      setMessage(
        result.existing
          ? "Opening the existing paper. Your saved review is preserved."
          : result.received
            ? "PDF received. No duplicate questions will be created."
            : "PDF received. Conversion starts automatically; it will enter PYQ after approval.",
      );
      form.reset();
      if (adminUpload && result.id)
        router.push(`/admin/contributions/${result.id}`);
      else router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-grid" aria-label="Upload PDF only">
      <h2>Upload your PDF</h2>
      <p>
        Choose the question paper. We create a private question draft
        automatically. Exam details and answers can be checked during approval.
      </p>
      <input type="hidden" name="pdfOnly" value="yes" />
      {adminUpload && <input type="hidden" name="adminUpload" value="yes" />}
      <label>
        Paper file
        <input
          type="file"
          name="file"
          accept=".pdf,application/pdf"
          required
          disabled={busy}
        />
      </label>
      <p className="muted">
        PDF up to 20 MB. Repeat uploads reopen the existing paper instead of
        making duplicate questions.
      </p>
      <Button disabled={busy}>{busy ? "Uploading PDF…" : "Upload PDF"}</Button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
export function ContributionReview({
  id,
  status,
  payload,
  credit = true,
  starterDraft = "",
  conversionStatus = "NOT_REQUIRED",
  exams = [],
}: {
  id: string;
  status: string;
  payload: string;
  credit?: boolean;
  starterDraft?: string;
  conversionStatus?: string;
  exams?: { id: string; name: string }[];
}) {
  const [text, setText] = useState(payload);
  const [conversion, setConversion] = useState(conversionStatus);
  const [conversionVersion, setConversionVersion] = useState(0);
  const [conversionError, setConversionError] = useState("");
  const [conversionSummary, setConversionSummary] = useState("");
  const [extracted, setExtracted] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  useEffect(() => {
    if (conversionStatus === "NOT_REQUIRED") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/contributions/${id}/conversion`, {
          cache: "no-store",
        });
        if (!response.ok)
          throw Error("Unable to check conversion. Refresh to try again.");
        const data = await response.json();
        if (cancelled) return;
        setConversion(data.conversionStatus);
        setConversionError(data.conversionError || "");
        if (data.conversionResult) {
          const result = data.conversionResult;
          setConversionSummary(
            `${result.questionCount || 0}${result.expectedQuestionCount ? ` of ${result.expectedQuestionCount}` : ""} questions extracted${result.layoutMode?.includes("SOURCE_IMAGES") ? " as original scan cards" : ""}. Review the answers below.`,
          );
          setWarnings(data.conversionResult.warnings || []);
          setExtracted(
            (data.conversionResult.pages || [])
              .map(
                (p: { page: number; method: string; text: string }) =>
                  `Page ${p.page} (${p.method})\n${p.text}`,
              )
              .join("\n\n"),
          );
        }
        // Preserve edits already made by the reviewer while processing completes.
        if (data.payload)
          setText(
            (previous) => previous || JSON.stringify(data.payload, null, 2),
          );
        if (["QUEUED", "PROCESSING"].includes(data.conversionStatus))
          timer = setTimeout(poll, 3000);
      } catch (e) {
        if (!cancelled)
          setConversionError(
            e instanceof Error ? e.message : "Unable to check conversion",
          );
      }
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, conversionStatus, conversionVersion]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function saveDraft() {
    setBusy(true);
    try {
      const response = await fetch(`/api/contributions/${id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(JSON.parse(text)),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setMessage(
        "Review draft saved. It is private until approved and published.",
      );
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save draft",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function review(decision: string, defaultNote?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/contributions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note: note.trim().length >= 10 ? note : (defaultNote ?? note),
          ...(decision === "APPROVE" ? { payload: JSON.parse(text) } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error);
      setMessage(
        decision === "APPROVE"
          ? credit
            ? "Paper published and contributor credited."
            : "Paper published for practice. Open Exam preparation to start studying."
          : "Review saved.",
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-grid">
      {message && (
        <p role="status" className="notice" aria-live="polite">
          {message}
        </p>
      )}
      {conversion !== "NOT_REQUIRED" && (
        <section aria-label="PDF conversion">
          <p role="status">PDF conversion: {conversion.replaceAll("_", " ")}</p>
          {["QUEUED", "PROCESSING"].includes(conversion) && (
            <p>
              Conversion runs automatically. This page updates as it finishes.
              If it stays queued, check that the PDF worker is running.
            </p>
          )}
          {conversionSummary && <p>{conversionSummary}</p>}
          {conversionError && (
            <div className="notice" role="alert">
              <p>{conversionError}</p>
              <p>
                On Windows, open a terminal in your MindMitra folder and run{" "}
                <code>npm.cmd run setup:pdf</code>. Restart the site after tools
                are ready, then choose Retry conversion below. Your uploaded PDF
                and saved review remain available.
              </p>
            </div>
          )}
          {warnings.length > 0 && (
            <details>
              <summary>Conversion notes</summary>
              <ul>
                {warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </details>
          )}
          {extracted && (
            <details>
              <summary>Extracted source text</summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                {extracted}
              </pre>
            </details>
          )}
          {["PENDING", "REJECTED"].includes(status) &&
            ["FAILED", "NEEDS_REVIEW", "READY", "CANCELLED"].includes(
              conversion,
            ) && (
              <Button
                secondary
                disabled={busy}
                onClick={async () => {
                  if (
                    text &&
                    !window.confirm(
                      "Reconvert this PDF and replace the current review draft?",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    const response = await fetch(
                      `/api/contributions/${id}/conversion`,
                      { method: "POST" },
                    );
                    const result = await response.json();
                    if (!response.ok) throw Error(result.error);
                    setText("");
                    setConversion("QUEUED");
                    setConversionVersion((version) => version + 1);
                    router.refresh();
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "Retry failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {status === "REJECTED"
                  ? "Reopen paper and convert"
                  : text
                    ? "Reconvert PDF (replaces draft)"
                    : "Retry conversion"}
              </Button>
            )}
        </section>
      )}
      {status === "REJECTED" && (
        <p className="notice">
          This paper was rejected, so conversion and answer review were closed.
          Choose Reopen paper and convert above to review it again. It remains
          private until you publish.
        </p>
      )}
      {status === "PENDING" && (
        <>
          {!text && (
            <section
              className="review-checklist"
              aria-label="Start question review"
            >
              <h2>Review questions and provide answers</h2>
              <p>
                {["QUEUED", "PROCESSING"].includes(conversion)
                  ? "Extraction is running. Questions and answer selectors will appear here automatically."
                  : "No question draft is available yet. Retry conversion above, or enter the questions from the original PDF yourself."}
              </p>
              {starterDraft && (
                <Button
                  secondary
                  disabled={busy}
                  onClick={() => setText(starterDraft)}
                >
                  Enter questions and answers manually
                </Button>
              )}
              <p>
                Students will see typed CBT questions and selectable options.
                The printed PDF is only a reference for your review.
              </p>
            </section>
          )}
          <PaperReviewEditor
            text={text}
            exams={exams}
            onChange={setText}
            disabled={busy}
            contributionId={id}
            onSave={saveDraft}
            onPublish={() =>
              review(
                "APPROVE",
                "Administrator reviewed the CBT question text, options and correct answers.",
              )
            }
          />
          <Button secondary disabled={busy || !text} onClick={saveDraft}>
            Save review draft
          </Button>
          <details>
            <summary>Advanced JSON (optional)</summary>
            <label>
              Reviewed question JSON
              <textarea
                aria-label="Reviewed question JSON"
                rows={12}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="The automatic PDF draft appears here when ready. Compare it with the original, set scoring and permission, and supply verified keys where available."
              />
            </label>
            <label>
              Load reviewed JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > MAX_JSON_BYTES) {
                      setMessage("JSON exceeds 2 MB");
                      return;
                    }
                    setText(await f.text());
                  }
                }}
              />
            </label>
          </details>
        </>
      )}
      <details className="section-gap">
        <summary>
          {status === "PENDING"
            ? "Other decisions: reject, or publish with unavailable keys"
            : "Change publication decision"}
        </summary>
        <p>
          For a fully scored paper, use Finish review and publish above.
          Publishing here can leave missing or disputed keys unscored. A review
          note of at least 10 characters is required for these decisions.
        </p>
        <label>
          Review note (shared with contributor)
          <textarea
            minLength={10}
            maxLength={4000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Record source permission, question and answer-key checks, or explain the rejection."
          />
        </label>
        <div className="row">
          {status === "PENDING" ? (
            <>
              <Button
                disabled={busy || note.trim().length < 10 || !text}
                onClick={() => review("APPROVE")}
              >
                Approve and publish
              </Button>
              <Button
                secondary
                disabled={busy || note.trim().length < 10}
                onClick={() => review("REJECT")}
              >
                Reject contribution
              </Button>
            </>
          ) : status === "APPROVED" ? (
            <Button
              secondary
              disabled={busy || note.trim().length < 10}
              onClick={() => review("REVOKE")}
            >
              Revoke and unpublish
            </Button>
          ) : null}
        </div>
      </details>
      {(status === "APPROVED" || message.startsWith("Paper published")) && (
        <Button href="/exams">Open exam preparation</Button>
      )}
    </div>
  );
}

export function ContributorProfile({ alias }: { alias: string }) {
  const [value, setValue] = useState(alias);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const r = await fetch("/api/contributor-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alias: value }),
          });
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          setMessage(
            value.trim()
              ? "Public alias saved."
              : "You are hidden from the leaderboard.",
          );
          router.refresh();
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Unable to save");
        }
      }}
    >
      <h2>Leaderboard privacy</h2>
      <label>
        Public alias
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={30}
          pattern="[a-zA-Z0-9 _-]*"
        />
      </label>
      <p>
        Clear your alias and save to leave the leaderboard. Your approved papers
        stay available for practice.
      </p>
      <Button>Save contributor alias</Button>
      <p role="status">{message}</p>
    </form>
  );
}
