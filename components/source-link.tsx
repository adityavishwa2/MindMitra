import type { ReactNode } from "react";
export function SourceLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return url.startsWith("https://") ? (
    <a className="text-link" href={url} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <span className="muted">Uploaded PDF · {children}</span>
  );
}
