"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { MAX_CONTRIBUTION_BYTES } from "@/lib/contributions";
export function ContributionForm({
  exams,
  alias,
}: {
  exams: { id: string; name: string }[];
  alias: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size > MAX_CONTRIBUTION_BYTES) {
      setMessage("Choose a PDF or JSON file up to 2 MB");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error);
      setMessage(
        "Submitted for review. Your paper is private until approval; points are awarded after publication.",
      );
      form.reset();
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-grid">
      <h2>Share a previous-year paper</h2>
      <p>
        Choose the exact exam, year, stage and shift. Upload a PDF or a
        structured paper JSON, up to 2 MB. A PDF is reviewed and converted into
        practice questions before publication.
      </p>
      <label>
        Examination
        <select aria-label="Examination" name="examId" required>
          <option value="">Choose an exam</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid-2">
        <label>
          Year
          <input
            name="year"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            defaultValue={new Date().getFullYear() - 1}
            required
          />
        </label>
        <label>
          Paper title
          <input name="title" minLength={3} maxLength={200} required />
        </label>
      </div>
      <div className="grid-2">
        <label>
          Stage
          <input
            name="stage"
            placeholder="e.g. Tier I"
            maxLength={100}
            required
          />
        </label>
        <label>
          Shift
          <input
            name="shift"
            placeholder="e.g. 12 June, morning"
            maxLength={100}
            required
          />
        </label>
      </div>
      <label>
        Original source URL
        <input
          name="sourceUrl"
          type="url"
          placeholder="https://…"
          maxLength={2000}
          required
        />
      </label>
      <label>
        Reuse permission and source evidence
        <textarea
          name="permissionEvidence"
          minLength={10}
          maxLength={5000}
          required
          placeholder="Explain where this paper came from and why it may be shared."
        />
      </label>
      <label>
        Paper file
        <input
          name="file"
          type="file"
          accept=".pdf,.json,application/pdf,application/json"
          required
        />
      </label>
      <label className="task-row">
        <input type="checkbox" name="rightsConfirmed" value="yes" required />I
        have permission to submit this material for review and reuse.
      </label>
      <label>
        Public contributor alias (optional)
        <input
          name="publicAlias"
          defaultValue={alias}
          maxLength={30}
          pattern="[a-zA-Z0-9 _-]*"
          placeholder="e.g. ExamHelper"
        />
      </label>
      <p className="muted">
        An alias opts you into the leaderboard. Leave it blank to stay off the
        leaderboard. Your email is never displayed there. Each approved,
        published paper earns 10 points. Pending, rejected, duplicate and
        revoked papers earn no points. Maximum 5 submissions per day and 10
        awaiting review.
      </p>
      <Button disabled={busy}>
        {busy ? "Uploading…" : "Submit for review"}
      </Button>
      <p role="status">{message}</p>
    </form>
  );
}
export function ContributionReview({
  id,
  status,
  payload,
}: {
  id: string;
  status: string;
  payload: string;
}) {
  const [text, setText] = useState(payload);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function review(decision: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/contributions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note,
          ...(decision === "APPROVE" ? { payload: JSON.parse(text) } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error);
      setMessage(
        decision === "APPROVE"
          ? "Paper published and contributor credited."
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
      {status === "PENDING" && (
        <>
          <label>
            Reviewed question JSON
            <textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="For a PDF, convert and verify the questions, then paste the import JSON here."
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
                  if (f.size > MAX_CONTRIBUTION_BYTES) {
                    setMessage("JSON exceeds 2 MB");
                    return;
                  }
                  setText(await f.text());
                }
              }}
            />
          </label>
        </>
      )}
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
      <p role="status">{message}</p>
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
