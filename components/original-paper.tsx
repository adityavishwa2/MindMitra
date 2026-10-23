"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
export function OriginalPaper({ id }: { id: string }) {
  const [page, setPage] = useState(1),
    [count, setCount] = useState(0),
    [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function read() {
      try {
        const r = await fetch(`/api/contributions/${id}/conversion`, {
          cache: "no-store",
        });
        const d = await r.json();
        if (cancelled) return;
        setCount(d.conversionResult?.pages?.length || 0);
        if (["QUEUED", "PROCESSING"].includes(d.conversionStatus))
          timer = setTimeout(read, 3000);
      } catch {
        /* Image and PDF links remain available. */
      }
    }
    void read();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);
  const url = `/api/contributions/${id}/question-image?regions=${encodeURIComponent(JSON.stringify([{ page, x: 0, y: 0, width: 1, height: 1 }]))}`;
  return (
    <aside className="pdf-original card">
      <details open>
        <summary>Original uploaded PDF</summary>
        <p className="muted">
          Admin reference only. Published practice uses typed CBT questions and
          options from your review.
        </p>
        <div className="original-controls">
          <button
            type="button"
            aria-label="Previous PDF page"
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => p - 1);
              setError(false);
            }}
          >
            ←
          </button>
          <label>
            Page
            <input
              aria-label="Original PDF page"
              type="number"
              min={1}
              max={count || 80}
              value={page}
              onChange={(e) => {
                setPage(
                  Math.max(
                    1,
                    Math.min(count || 80, Number(e.target.value) || 1),
                  ),
                );
                setError(false);
              }}
            />
          </label>
          <span>{count ? `/ ${count}` : ""}</span>
          <button
            type="button"
            aria-label="Next PDF page"
            disabled={page >= (count || 80)}
            onClick={() => {
              setPage((p) => p + 1);
              setError(false);
            }}
          >
            →
          </button>
        </div>
        <a
          className="text-link"
          href={`/api/contributions/${id}?preview=1#page=${page}`}
          target="_blank"
          rel="noreferrer"
        >
          Open original PDF ↗
        </a>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open original page at full size"
        >
          <Image
            unoptimized
            key={url}
            src={url}
            width={1200}
            height={1700}
            alt={`Original uploaded PDF page ${page}`}
            className="original-page-image"
            onError={() => setError(true)}
          />
        </a>
        {error && (
          <p>
            Page preview unavailable. Open the original PDF above, or try
            another page.
          </p>
        )}
      </details>
    </aside>
  );
}
