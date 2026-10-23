"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileUp,
  FileCheck2,
  Video,
  Upload,
  BookOpen,
  Users,
  GraduationCap,
  LogOut,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
const links = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/imports", "Upload paper", FileUp],
  ["/admin/contributions", "Review papers", FileCheck2],
  ["/admin/videos/upload", "Upload video", Upload],
  ["/admin/videos", "Review videos", Video],
  ["/admin/questions", "Paper library", BookOpen],
  ["/admin/exams", "Examinations", GraduationCap],
  ["/admin/users", "Accounts", Users],
] as const;
export function AdminStudio({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const pathname = usePathname();
  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <Link href="/admin" className="studio-brand">
          <span className="studio-mark">
            M<span>✦</span>
          </span>
          <span>
            MindMitra<small>CONTENT STUDIO</small>
          </span>
        </Link>
        <span className="studio-label">YOUR WORKSPACE</span>
        <nav aria-label="Administration">
          {links.map(([href, label, Icon]) => (
            <a
              key={href}
              href={href}
              aria-current={
                (
                  href === "/admin"
                    ? pathname === href
                    : href === "/admin/videos"
                      ? pathname.startsWith(href) &&
                        !pathname.endsWith("/upload")
                      : pathname.startsWith(href)
                )
                  ? "page"
                  : undefined
              }
            >
              <Icon size={19} />
              {label}
            </a>
          ))}
        </nav>
        <div className="studio-sidebar-bottom">
          <Link href="/exams">
            Open student experience <ArrowUpRight size={16} />
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut size={16} /> Sign out
          </button>
          <small>Private administration workspace</small>
        </div>
      </aside>
      <div className="studio-body">
        <header className="studio-topbar">
          <span>
            <span className="studio-status" /> Administrator access
          </span>
          <button
            className="studio-mobile-signout"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </button>
          <span className="studio-avatar" aria-label={name}>
            AV
          </span>
        </header>
        <main className="studio-main" id="main-content">
          <div className="studio-greeting">
            <span className="studio-label">
              <Sparkles size={14} /> MAKE ROOM FOR LEARNING
            </span>
            <h1>
              Welcome, {name}
              <span> ✦</span>
            </h1>
            <p>
              Your ideas become their next breakthrough. Upload, review and
              publish from one place.
            </p>
          </div>
          <div className="studio-page" key={pathname}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
