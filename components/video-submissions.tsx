"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadCloud, Video, Sparkles, ArrowUpRight } from "lucide-react";
import { MAX_VIDEO_BYTES } from "@/lib/video-policy";
import { Button } from "./ui";

// A full document navigation applies the recorder route camera/microphone policy.
export function CreateVideoButton() {
  return (
    <a href="/watch/create" className="lesson-launch">
      <span className="lesson-launch-icon">
        <Video size={21} />
        <Sparkles size={12} className="lesson-spark" />
      </span>
      <span>
        Create a learning video
        <small>Record or upload your next bright idea</small>
      </span>
      <ArrowUpRight size={21} className="lesson-launch-arrow" />
    </a>
  );
}

export function VideoSubmissionForm({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [live, setLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bytesRecorded = useRef(0);
  const chunks = useRef<Blob[]>([]);
  const mounted = useRef(true);
  const previewURL = useRef("");
  function updatePreview(file: File | null) {
    if (previewURL.current) URL.revokeObjectURL(previewURL.current);
    previewURL.current = file ? URL.createObjectURL(file) : "";
    setPreview(previewURL.current);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (previewURL.current) URL.revokeObjectURL(previewURL.current);
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  async function record() {
    setMessage("");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMessage(
        "Recording needs a supported browser on HTTPS or localhost. You can upload a video file instead.",
      );
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      if (!mounted.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      setRecorded(null);
      updatePreview(null);
      setSeconds(0);
      setLive(true);
      // React mounts the preview after permission is granted.
      const type = [
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!type)
        throw Error(
          "This browser cannot record MP4/WebM. Upload a file instead.",
        );
      const r = new MediaRecorder(stream.current, {
        mimeType: type,
        videoBitsPerSecond: 800_000,
      });
      recorder.current = r;
      chunks.current = [];
      bytesRecorded.current = 0;
      r.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.current.push(e.data);
          bytesRecorded.current += e.data.size;
        }
        if (bytesRecorded.current > MAX_VIDEO_BYTES) {
          setMessage(
            "Recording reached the 25 MB limit. Make a shorter recording before uploading.",
          );
          stop();
        }
      };
      r.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        stream.current?.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        const mime = type.startsWith("video/mp4") ? "video/mp4" : "video/webm";
        const blob = new Blob(chunks.current, { type: mime });
        if (blob.size <= MAX_VIDEO_BYTES) {
          const file = new File(
            [blob],
            mime === "video/mp4"
              ? "recorded-lesson.mp4"
              : "recorded-lesson.webm",
            { type: mime },
          );
          setRecorded(file);
          updatePreview(file);
        }
        setRecording(false);
        setLive(false);
      };
      r.onerror = () => {
        setMessage("Recording failed. Try uploading a file.");
        stop();
      };
      r.start(1000);
      setRecording(true);
      timer.current = setTimeout(stop, 175_000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setLive(false);
      setMessage(
        e instanceof Error
          ? e.message
          : "Camera or microphone access was declined. Upload a file instead.",
      );
    }
  }
  useEffect(() => {
    if (live && video.current) video.current.srcObject = stream.current;
  }, [live]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const form = e.currentTarget;
    const data = new FormData(form);
    if (recorded) data.set("file", recorded);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_VIDEO_BYTES) {
      setMessage("Choose or record an MP4/WebM video up to 25 MB.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/video-submissions", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setMessage(
        "Video uploaded privately for review. It cannot appear in Learn Shorts until approved.",
      );
      form.reset();
      setRecorded(null);
      updatePreview(null);
      if (admin) router.push(`/admin/videos/${result.id}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="lesson-record-card">
        <span className="badge">A LITTLE KNOWLEDGE GOES A LONG WAY</span>
        <h2>Make something worth learning.</h2>
        <p>
          Teach one clear idea in up to three minutes. Upload MP4/WebM (25 MB
          maximum), or record with your camera and microphone.
        </p>
        <div className="controls">
          <Button
            type="button"
            secondary
            disabled={busy || recording}
            onClick={record}
          >
            Record a lesson
          </Button>
          {recording && (
            <Button type="button" onClick={stop}>
              Stop recording · {seconds}s
            </Button>
          )}
        </div>
        {live && (
          <video
            aria-label="Live camera preview"
            ref={video}
            autoPlay
            muted
            playsInline
            className="lesson-preview"
          />
        )}
        {preview && !live && (
          <video
            aria-label="Recorded lesson preview"
            src={preview}
            controls
            playsInline
            className="lesson-preview"
          />
        )}
        {recorded && (
          <p>
            Ready: {recorded.name} · {(recorded.size / 1_000_000).toFixed(1)} MB{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setRecorded(null);
                updatePreview(null);
              }}
            >
              Discard recording
            </button>
          </p>
        )}
      </div>
      <label>
        Video file
        <input
          name="file"
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm"
          disabled={busy || recording}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setRecorded(null);
            updatePreview(file);
            if (file && file.size > MAX_VIDEO_BYTES)
              setMessage("Choose a video up to 25 MB");
          }}
        />
      </label>
      <label>
        Lesson title
        <input name="title" required minLength={3} maxLength={200} />
      </label>
      <label>
        Creator name
        <input
          name="creator"
          required
          minLength={2}
          maxLength={100}
          defaultValue={admin ? "MindMitra Educators" : ""}
          readOnly={admin}
        />
      </label>
      <div className="notice">
        <strong>Education comes first.</strong>
        <p>
          No nudity, sexual content, abuse, harassment, graphic violence, hate,
          dangerous activities, advertising, external promotions or unrelated
          entertainment. Every submission remains private until a moderator
          reviews it in full.
        </p>
      </div>
      <label className="task-row">
        <input type="checkbox" name="rightsConfirmed" value="yes" required />I
        created this video or have permission from its creator and everyone
        shown.
      </label>
      <label className="task-row">
        <input type="checkbox" name="policyConfirmed" value="yes" required />
        This video is educational and follows the educational content rules.
      </label>
      <button
        className="lesson-submit"
        type="submit"
        disabled={busy || recording}
      >
        <span className="lesson-submit-orbit" aria-hidden="true" />
        <UploadCloud size={23} />
        <span>
          {busy ? "Checking and uploading…" : "Send my lesson for review"}
        </span>
        <Sparkles size={18} />
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

const reviewChecks = [
  ["watchedInFull", "I watched the complete video and listened to its audio."],
  ["educational", "It teaches an educational topic accurately."],
  ["noNudity", "No nudity or sexual content appears anywhere."],
  [
    "noAbuse",
    "No abuse, hate, harassment, graphic violence or dangerous activities.",
  ],
  [
    "noPromotion",
    "No advertising, external promotions or unrelated entertainment.",
  ],
] as const;

export function VideoReviewForm({
  id,
  status,
  self,
}: {
  id: string;
  status: string;
  self: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const missing = reviewChecks.filter(([key]) => !checks[key]);
  const noteReady = note.trim().length >= 15;
  async function review(decision: "APPROVE" | "REJECT" | "REVOKE") {
    setMessage("");
    if (!noteReady) {
      setMessage(
        "Add a moderation note of at least 15 characters explaining your decision.",
      );
      return;
    }
    if (decision === "APPROVE" && (self || missing.length)) {
      setMessage(
        self
          ? "Another administrator must approve your upload. Sign in with an independent reviewer's admin account."
          : "Complete all five checks before approving this video.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/video-submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note,
          ...Object.fromEntries(
            reviewChecks.map(([key]) => [key, !!checks[key]]),
          ),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Unable to save review. Try again.");
      setMessage(
        decision === "APPROVE"
          ? "Educational video approved and published."
          : decision === "REJECT"
            ? "Video rejected. It remains hidden from students."
            : "Video revoked and hidden from students.",
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Review failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="form-grid" aria-label="Video approval checklist">
      {message && (
        <p role="status" className="notice" aria-live="polite">
          {message}
        </p>
      )}
      {status === "PENDING" && (
        <>
          <h2>2. Complete the review checks</h2>
          {self && (
            <div className="notice" role="note">
              <strong>This is your own upload.</strong>
              <p>
                Another administrator must approve it. This account can reject
                it, but cannot publish it. Ask another signed-in administrator
                to open this review page. Instructions for adding an
                administrator are in docs/admin-review.md.
              </p>
            </div>
          )}
          <p>
            {5 - missing.length} of 5 checks completed. Tick each item only
            after watching the whole video and listening to its audio.
          </p>
          <fieldset disabled={busy}>
            <legend>Educational and content checks</legend>
            {reviewChecks.map(([key, label]) => (
              <label className="task-row" key={key}>
                <input
                  type="checkbox"
                  name={key}
                  checked={!!checks[key]}
                  onChange={(e) =>
                    setChecks({ ...checks, [key]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
        </>
      )}
      {(status === "PENDING" || status === "APPROVED") && (
        <>
          <h2>
            {status === "PENDING"
              ? "3. Save your decision"
              : "Change publication decision"}
          </h2>
          <label>
            Moderation note
            <textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={3000}
              placeholder="Explain what you checked, or why this video should be rejected."
              disabled={busy}
            />
          </label>
          <p className="muted">
            {note.trim().length} / 15 characters minimum. A note is required for
            approval, rejection or revocation.
          </p>
          {status === "PENDING" && (
            <div className="review-checklist">
              <strong>
                {self
                  ? "Approval needs a different administrator."
                  : missing.length || !noteReady
                    ? "Before approval:"
                    : "Ready to approve and publish."}
              </strong>
              <ul>
                {missing.length > 0 && (
                  <li>
                    Complete {missing.length} remaining content check
                    {missing.length === 1 ? "" : "s"} above.
                  </li>
                )}
                {!noteReady && (
                  <li>Add a moderation note with at least 15 characters.</li>
                )}
              </ul>
            </div>
          )}
          <div className="controls">
            {status === "PENDING" ? (
              <>
                <Button
                  type="button"
                  disabled={busy || self || missing.length > 0 || !noteReady}
                  onClick={() => void review("APPROVE")}
                >
                  {busy ? "Saving decision…" : "Approve educational video"}
                </Button>
                <Button
                  type="button"
                  secondary
                  disabled={busy || !noteReady}
                  onClick={() => void review("REJECT")}
                >
                  Reject video
                </Button>
              </>
            ) : (
              <Button
                type="button"
                secondary
                disabled={busy || !noteReady}
                onClick={() => void review("REVOKE")}
              >
                Revoke and hide video
              </Button>
            )}
          </div>
        </>
      )}
      <Link href="/admin/videos" className="text-link">
        Back to video reviews →
      </Link>
      {status === "APPROVED" && (
        <Link href="/watch" className="button secondary">
          Open published Learn Shorts
        </Link>
      )}
    </section>
  );
}
