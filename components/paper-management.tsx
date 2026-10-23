"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";
export function PaperManagement({
  id,
  kind,
  published = false,
  detail = false,
}: {
  id: string;
  kind: "paper" | "contribution";
  published?: boolean;
  detail?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: "HIDE" | "DELETE") {
    if (
      !window.confirm(
        action === "DELETE"
          ? "Permanently delete this paper and its upload/review? This cannot be undone. Papers with practice history must be hidden instead."
          : "Hide this paper from students? New practice attempts will be blocked. Existing attempts and results will remain.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/papers/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, kind, action }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setMessage(
        action === "HIDE" ? "Paper hidden from students." : "Paper deleted.",
      );
      if (detail && action === "DELETE") router.push("/admin/contributions");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="section-gap">
      <div className="controls">
        {published && (
          <Button secondary disabled={busy} onClick={() => act("HIDE")}>
            Hide from students
          </Button>
        )}
        <Button secondary disabled={busy} onClick={() => act("DELETE")}>
          Delete paper
        </Button>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </div>
  );
}
