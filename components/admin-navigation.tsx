"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AdminNavigation() {
  const path = usePathname();
  return (
    <nav aria-label="Administration" className="admin-navigation no-print">
      <div className="filters">
        {[
          ["/admin", "Start here"],
          ["/admin/contributions", "Review papers"],
          ["/admin/videos", "Review videos"],
          ["/admin/imports", "Upload a paper"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="chip"
            aria-current={
              (href === "/admin" ? path === href : path.startsWith(href))
                ? "page"
                : undefined
            }
          >
            {label}
          </Link>
        ))}
      </div>
      <details>
        <summary>More admin tools</summary>
        <div className="filters">
          {[
            ["exams", "Examinations"],
            ["users", "Users"],
            ["questions", "Existing paper library"],
          ].map(([href, label]) => (
            <Link key={href} className="chip" href={`/admin/${href}`}>
              {label}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
