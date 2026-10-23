"use client";
import Image from "next/image";
import { useState } from "react";
export function SourceQuestionImage({
  url,
  number,
}: {
  url: string;
  number: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="form-grid">
      {failed ? (
        <p role="alert">
          The source image could not load. Check the server Poppler
          installation, or open the submitted PDF.
        </p>
      ) : (
        <Image
          src={url}
          alt={`Original scan of question ${number} and its options`}
          width={1200}
          height={1400}
          unoptimized
          style={{
            width: "100%",
            maxWidth: 900,
            height: "auto",
            borderRadius: 12,
            border: "1px solid var(--line)",
          }}
          onError={() => setFailed(true)}
        />
      )}
      <a
        className="text-link"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open full-size question image ↗
      </a>
    </div>
  );
}
