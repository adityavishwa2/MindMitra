import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <div className="filters no-print">
        {[
          ["", "Overview"],
          ["/exams", "Examinations"],
          ["/imports", "Import papers"],
          ["/contributions", "Contributions"],
          ["/users", "Users"],
          ["/questions", "Verification queue"],
          ["/coverage", "Coverage"],
          ["/videos", "Videos"],
        ].map(([p, t]) => (
          <Link className="chip" key={p} href={`/admin${p}`}>
            {t}
          </Link>
        ))}
      </div>
      {children}
    </>
  );
}
