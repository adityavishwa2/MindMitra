"use client";
import { Text } from "@/components/translation";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "./ui";
export function JsonImport({
  exams,
}: {
  exams: { id: string; name: string }[];
}) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="form-grid">
      <p>
        <Text value="Import a rights-documented JSON paper. The import creates a review draft; it does not publish questions. See docs/imports.md for the schema." />
      </p>
      <label>
        <Text value="Examination ID reference" />
        <select
          onChange={(e) => navigator.clipboard?.writeText(e.target.value)}
        >
          <option value="">
            <Text value="Select to copy an examination ID" />
          </option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} — {e.id}
            </option>
          ))}
        </select>
      </label>
      <label>
        <Text value="Choose a JSON document (max 2 MB)" />
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2000000) {
              setMessage("File exceeds 2 MB");
              return;
            }
            setText(await file.text());
          }}
        />
      </label>
      <label>
        <Text value="Structured paper JSON" />
        <textarea
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your authorized paper payload"
        />
      </label>
      <Button
        disabled={busy || !text}
        onClick={async () => {
          setBusy(true);
          try {
            await api("admin/import", JSON.parse(text));
            setMessage("Imported into the verification queue. Not published.");
            setText("");
            router.refresh();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Text value="Validate and import" />
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}
export function ReviewPaper({
  paperId,
  published,
}: {
  paperId: string;
  published: boolean;
}) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="form-grid section-gap">
      <label>
        <Text value="Verification record" />
        <textarea
          value={note}
          minLength={10}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Record source comparison, option order, diagrams, answer-key checks, and reuse evidence."
        />
      </label>
      <div className="row">
        <Button
          disabled={note.length < 10}
          onClick={async () => {
            try {
              await api("admin/review", {
                paperId,
                decision: published ? "UNPUBLISH" : "APPROVE",
                note,
              });
              setMessage("Review saved.");
              router.refresh();
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          {published ? "Unpublish paper" : "Approve and publish"}
        </Button>
        {!published && (
          <Button
            secondary
            disabled={note.length < 10}
            onClick={async () => {
              try {
                await api("admin/review", {
                  paperId,
                  decision: "REJECT",
                  note,
                });
                setMessage("Returned for correction.");
                router.refresh();
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <Text value="Return for correction" />
          </Button>
        )}
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
export function AdminVideoForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const d = new FormData(form);
        try {
          await api("admin/video", {
            title: d.get("title"),
            creator: d.get("creator"),
            youtubeId: d.get("youtubeId"),
            category: d.get("category"),
            approved: d.get("approved") === "on",
          });
          setMessage("Video moderation saved.");
          form.reset();
          router.refresh();
        } catch (e) {
          setMessage((e as Error).message);
        }
      }}
    >
      <label>
        <Text value="Video title" />
        <input name="title" required />
      </label>
      <label>
        <Text value="Creator attribution" />
        <input name="creator" required />
      </label>
      <label>
        <Text value="YouTube video ID" />
        <input name="youtubeId" pattern="[a-zA-Z0-9_-]{11}" required />
      </label>
      <label>
        <Text value="Educational category" />
        <select name="category">
          {[
            "Mathematics",
            "Science",
            "History",
            "Study skills",
            "Reasoning",
            "English",
            "Current affairs",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="row">
        <input
          style={{ width: 18, minHeight: 18 }}
          type="checkbox"
          name="approved"
        />
        <Text value="Reviewed and approved for educational use" />
      </label>
      <p>
        <Text value="Submit an existing video ID with approval unchecked to remove it from the student feed." />
      </p>
      <Button>
        <Text value="Save moderation decision" />
      </Button>
      <p role="status">{message}</p>
    </form>
  );
}
export function AdminExamForm() {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          d = new FormData(form);
        try {
          await api("admin/exam", {
            name: d.get("name"),
            slug: d.get("slug"),
            category: d.get("category"),
            authority: d.get("authority"),
            subjects: String(d.get("subjects"))
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
          setMessage("Examination added.");
          form.reset();
          router.refresh();
        } catch (e) {
          setMessage((e as Error).message);
        }
      }}
    >
      {[
        ["name", "Examination name"],
        ["slug", "URL slug (lowercase-with-hyphens)"],
        ["category", "Category"],
        ["authority", "Conducting authority"],
        ["subjects", "Subjects (comma-separated)"],
      ].map(([name, label]) => (
        <label key={name}>
          {label}
          <input name={name} required />
        </label>
      ))}
      <Button>
        <Text value="Add examination" />
      </Button>
      <p role="status">{message}</p>
    </form>
  );
}

export function QuestionCorrection({
  questionId,
  initial,
}: {
  questionId: string;
  initial: string;
}) {
  const [text, setText] = useState(initial);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="form-grid section-gap">
      <label>
        <Text value="Correct extracted question (JSON)" />
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <label>
        <Text value="Reason for correction" />
        <input
          minLength={10}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <Button
        secondary
        disabled={note.length < 10}
        onClick={async () => {
          try {
            await api("admin/question", {
              questionId,
              question: JSON.parse(text),
              note,
            });
            setMessage("Correction saved. A new answer-key version was added.");
            router.refresh();
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <Text value="Save correction for review" />
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}
export function SourcePermission({ sourceId }: { sourceId: string }) {
  const [permission, setPermission] = useState("PENDING");
  const [evidence, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <details>
      <summary>
        <Text value="Update reuse authorization" />
      </summary>
      <div className="form-grid section-gap">
        <label>
          <Text value="Permission status" />
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
          >
            <option>
              <Text value="PENDING" />
            </option>
            <option>
              <Text value="AUTHORIZED" />
            </option>
            <option>
              <Text value="DENIED" />
            </option>
          </select>
        </label>
        <label>
          <Text value="Documented authorization or reason" />
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </label>
        <Button
          secondary
          disabled={evidence.length < 10}
          onClick={async () => {
            try {
              await api("admin/permission", {
                sourceId,
                permission,
                permissionEvidence: evidence,
              });
              setMessage("Permission record updated.");
              router.refresh();
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          <Text value="Save authorization record" />
        </Button>
        <p role="status">{message}</p>
      </div>
    </details>
  );
}
