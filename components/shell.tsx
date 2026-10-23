"use client";
import { Text } from "@/components/translation";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpen,
  LayoutDashboard,
  Gamepad2,
  ChartNoAxesCombined,
  CalendarDays,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Search,
  LogOut,
  ShieldCheck,
  UserRound,
  WifiOff,
  Upload,
  Trophy,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useLocale } from "./providers";
const links = [
  ["/dashboard", "Home", "होम", LayoutDashboard],
  ["/exams", "Exam preparation", "परीक्षा तैयारी", BookOpen],
  ["/games", "Mind Break", "मन का विराम", Gamepad2],
  ["/progress", "My progress", "मेरी प्रगति", ChartNoAxesCombined],
  ["/contribute", "Contribute papers", "प्रश्नपत्र योगदान", Upload],
  ["/leaderboard", "Contributors", "योगदानकर्ता", Trophy],
  ["/planner", "Study planner", "अध्ययन योजना", CalendarDays],
] as const;
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <BookOpen size={23} />
      </span>
      Mind<span>Mitra</span>
      <span className="brand-dot">✦</span>
    </Link>
  );
}
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    queueMicrotask(() =>
      setDark(document.documentElement.dataset.theme === "dark"),
    );
  }, []);
  return (
    <button
      className="icon-button"
      aria-label="Toggle theme"
      onClick={() => {
        const v = !dark;
        setDark(v);
        document.documentElement.dataset.theme = v ? "dark" : "light";
        localStorage.setItem("mm-theme", v ? "dark" : "light");
      }}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
export function AppShell({
  children,
  name,
  admin = false,
  initialLanguage,
}: {
  children: ReactNode;
  name: string;
  admin?: boolean;
  initialLanguage?: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const { t, setLanguage, language } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (initialLanguage) queueMicrotask(() => setLanguage(initialLanguage));
    const update = () => setOnline(navigator.onLine);
    queueMicrotask(update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [initialLanguage, setLanguage]);
  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <a className="skip" href="#main">
        <Text value="Skip to content" />
      </a>
      <aside className="sidebar">
        <Brand />
        <button
          className="collapse icon-button"
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </button>
        <span className="nav-caption">
          <Text value="YOUR LEARNING SPACE" />
        </span>
        <nav>
          {links.map(([url, en, hi, Icon]) => (
            <Link
              key={url}
              href={url}
              aria-current={path.startsWith(url) ? "page" : undefined}
              className={path.startsWith(url) ? "active" : ""}
            >
              <Icon size={20} />
              <span>{t(en, hi)}</span>
              {url === "/games" && <small>PLAY</small>}
            </Link>
          ))}
          {admin && (
            <Link href="/admin">
              <ShieldCheck size={20} />
              <span>
                <Text value="Administration" />
              </span>
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-note">
            <span>
              <Text value="✦ A little every day." />
            </span>
            <p>
              <Text value="Big things take small steps." />
            </p>
          </div>
          <Link href="/profile">
            <UserRound size={18} />
            <span>{t("My profile", "मेरी प्रोफ़ाइल")}</span>
          </Link>
          <Link href="/settings">
            <Settings size={18} />
            <span>{t("Settings", "सेटिंग्स")}</span>
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut size={18} />
            <span>{t("Sign out", "साइन आउट")}</span>
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <form action="/exams" className="search">
            <Search size={18} />
            <input
              name="q"
              aria-label="Search examinations"
              placeholder={t(
                "What would you like to learn?",
                "आप क्या सीखना चाहेंगे?",
              )}
            />
            <kbd>↵</kbd>
          </form>
          <div className="top-actions">
            <button
              className="language-button"
              onClick={async () => {
                const next = language === "en" ? "hi" : "en";
                setLanguage(next);
                if (initialLanguage) {
                  try {
                    await api("language", { language: next });
                    router.refresh();
                  } catch {}
                }
              }}
            >
              {language === "en" ? "अ हिंदी" : "English"}
            </button>
            <Link
              href="/settings"
              className="icon-button"
              aria-label="Settings"
            >
              <Settings size={20} />
            </Link>
            <ThemeToggle />
            <Link href="/profile" className="avatar" aria-label="Open profile">
              {name[0]?.toUpperCase() ?? "M"}
            </Link>
          </div>
        </header>
        {!online && (
          <div className="notice">
            <WifiOff size={18} />
            <Text value="You’re offline. Saved answers stay on this device until you reconnect." />
          </div>
        )}
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <Text value="Made for your next small step." />
          <span>
            <Text value="Learn. Play. Grow. ✦" />
          </span>
        </footer>
      </div>
      <nav className="mobile-nav">
        {links.slice(0, 5).map(([url, en, hi, Icon]) => (
          <Link
            key={url}
            className={path.startsWith(url) ? "active" : ""}
            href={url}
          >
            <Icon size={21} />
            <span>{t(en.split(" ")[0], hi.split(" ")[0])}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function LanguageToggle() {
  const { language, setLanguage } = useLocale();
  return (
    <button
      className="language-button"
      aria-label="Switch interface language"
      onClick={() => setLanguage(language === "en" ? "hi" : "en")}
    >
      {language === "en" ? "हिंदी" : "English"}
    </button>
  );
}
