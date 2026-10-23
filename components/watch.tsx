"use client";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  Bookmark,
  Volume2,
  VolumeX,
  Flag,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button, EmptyState } from "./ui";
type Video = {
  id: string;
  title: string;
  creator: string;
  youtubeId: string | null;
  mediaUrl?: string | null;
  category: string;
  liked?: boolean;
  likeCount?: number;
  saved?: boolean;
};
export function WatchFeed({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState(0),
    [muted, setMuted] = useState(true),
    [hidden, setHidden] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [seconds, setSeconds] = useState(0),
    [limit, setLimit] = useState(300);
  const [likes, setLikes] = useState<
    Record<string, { liked: boolean; count: number }>
  >(() =>
    Object.fromEntries(
      videos.map((v) => [v.id, { liked: !!v.liked, count: v.likeCount ?? 0 }]),
    ),
  );
  const [saved, setSaved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(videos.map((v) => [v.id, !!v.saved])),
  );
  const [busy, setBusy] = useState<string[]>([]),
    [playing, setPlaying] = useState(false),
    [blocked, setBlocked] = useState(false);
  const feed = useRef<HTMLDivElement>(null),
    cards = useRef<(HTMLElement | null)[]>([]),
    players = useRef<(HTMLVideoElement | null)[]>([]);
  const segment = useRef({ id: "", seconds: 0 });
  const filtered = videos.filter((v) => !hidden.includes(v.id));
  const current = filtered[active],
    done = seconds >= limit;
  function flush() {
    const s = segment.current;
    if (s.id && s.seconds) {
      segment.current = { id: s.id, seconds: 0 };
      void api("watch", {
        videoId: s.id,
        seconds: Math.min(600, s.seconds),
      }).catch(() => setMessage("Watch time could not be saved."));
    }
  }
  useEffect(() => {
    const root = feed.current;
    if (!root || done) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            const i = Number((entry.target as HTMLElement).dataset.index);
            setActive(i);
          }
      },
      { root, threshold: [0.65, 0.85] },
    );
    cards.current.forEach((c) => c && observer.observe(c));
    return () => observer.disconnect();
  }, [hidden, done]);
  useEffect(() => {
    let cancelled = false;
    flush();
    segment.current = { id: current?.id ?? "", seconds: 0 };
    queueMicrotask(() => {
      setBlocked(false);
      setPlaying(!!current?.youtubeId && !done);
    });
    players.current.forEach((p, i) => {
      if (!p) return;
      if (i !== active || done) p.pause();
      else {
        p.muted = muted;
        void p
          .play()
          .then(() => {
            if (!cancelled) {
              setPlaying(!p.paused);
              setBlocked(false);
            }
          })
          .catch(() => {
            if (!cancelled) setBlocked(true);
          });
      }
    });

    return () => {
      cancelled = true;
      flush();
    };
    // Playback changes with the visible card; volume is handled without restarting it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, current?.id, done]);
  useEffect(() => {
    players.current.forEach((p) => {
      if (p) p.muted = muted;
    });
  }, [muted]);
  useEffect(() => {
    const tick = setInterval(() => {
      if (playing && !done && document.visibilityState === "visible") {
        setSeconds((s) => s + 1);
        segment.current.seconds++;
        if (segment.current.seconds >= 15) flush();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [playing, done]);
  useEffect(() => {
    const visibility = () => {
      const p = players.current[active];
      if (document.hidden) {
        p?.pause();
        flush();
      } else if (p && !done) void p.play().catch(() => setBlocked(true));
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [active, done]);
  function scrollTo(index: number) {
    cards.current[
      Math.max(0, Math.min(filtered.length - 1, index))
    ]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }
  async function like(v: Video) {
    if (busy.includes(v.id)) return;
    setBusy((b) => [...b, v.id]);
    try {
      const response = await fetch(`/api/videos/${v.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: !likes[v.id]?.liked }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setLikes((previous) => ({
        ...previous,
        [v.id]: { liked: data.liked, count: data.count },
      }));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy((b) => b.filter((id) => id !== v.id));
    }
  }
  if (!videos.length)
    return (
      <EmptyState title="Lessons are on their way">
        Approved educational videos will appear here.
      </EmptyState>
    );
  return (
    <section
      className="shorts-section"
      aria-label="Learn Shorts"
      data-playing={playing ? "true" : "false"}
    >
      <div className="shorts-toolbar">
        <span>Swipe or scroll for the next lesson</span>
        <label>
          Viewing session
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={300}>5 minutes</option>
            <option value={600}>10 minutes</option>
          </select>
        </label>
        <span>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      {done ? (
        <div className="empty">
          <h2>Your learning break is complete.</h2>
          <Button href="/dashboard">Return to study →</Button>
        </div>
      ) : (
        <div className="shorts-stage">
          <div
            ref={feed}
            className="reels-feed"
            role="region"
            aria-label="Scrollable learning videos"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                scrollTo(active + (e.key === "ArrowDown" ? 1 : -1));
              }
            }}
          >
            {filtered.map((v, i) => (
              <article
                className="reel-card"
                data-index={i}
                key={v.id}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                aria-label={`Video ${i + 1}: ${v.title}`}
              >
                {v.mediaUrl ? (
                  <video
                    ref={(el) => {
                      players.current[i] = el;
                    }}
                    className="video-frame reel-video"
                    src={Math.abs(i - active) <= 1 ? v.mediaUrl : undefined}
                    aria-label={v.title}
                    playsInline
                    muted={muted}
                    loop
                    preload={Math.abs(i - active) <= 1 ? "metadata" : "none"}
                    onPlay={() => {
                      if (i === active) {
                        setPlaying(true);
                        setBlocked(false);
                      }
                    }}
                    onPause={() => {
                      if (i === active) setPlaying(false);
                    }}
                    onError={() => {
                      if (i === active)
                        setMessage(
                          "This video could not load. Try the next lesson or reload.",
                        );
                    }}
                  />
                ) : i === active ? (
                  <iframe
                    className="video-frame reel-video"
                    title={v.title}
                    src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0&cc_load_policy=1`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : null}
                <div className="reel-gradient" />
                <div className="reel-top">
                  <span>{v.category}</span>
                  <button
                    type="button"
                    aria-label={muted ? "Turn sound on" : "Mute video"}
                    onClick={() => setMuted((m) => !m)}
                  >
                    {muted ? <VolumeX /> : <Volume2 />}
                  </button>
                </div>
                <div className="reel-caption">
                  <p>@{v.creator}</p>
                  <h2>{v.title}</h2>
                  <span>
                    {i + 1} / {filtered.length}
                  </span>
                </div>
                <div className="reel-actions">
                  <button
                    type="button"
                    className={likes[v.id]?.liked ? "is-liked" : ""}
                    aria-label={
                      likes[v.id]?.liked ? "Unlike video" : "Like video"
                    }
                    aria-pressed={!!likes[v.id]?.liked}
                    disabled={busy.includes(v.id)}
                    onClick={() => void like(v)}
                  >
                    <Heart
                      fill={likes[v.id]?.liked ? "currentColor" : "none"}
                    />
                    <span>{likes[v.id]?.count ?? 0}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={
                      saved[v.id] ? "Remove bookmark" : "Bookmark video"
                    }
                    aria-pressed={!!saved[v.id]}
                    onClick={async () => {
                      try {
                        await api("video-bookmark", {
                          videoId: v.id,
                          saved: !saved[v.id],
                        });
                        setSaved((s) => ({ ...s, [v.id]: !s[v.id] }));
                      } catch (e) {
                        setMessage((e as Error).message);
                      }
                    }}
                  >
                    <Bookmark fill={saved[v.id] ? "currentColor" : "none"} />
                    <span>Save</span>
                  </button>
                  {v.mediaUrl && (
                    <button
                      type="button"
                      aria-label={
                        i === active && playing ? "Pause video" : "Resume video"
                      }
                      onClick={() => {
                        const p = players.current[i];
                        if (p?.paused)
                          void p.play().catch(() => setBlocked(true));
                        else p?.pause();
                      }}
                    >
                      {i === active && playing ? <Pause /> : <Play />}
                      <span>{i === active && playing ? "Pause" : "Play"}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Report a concern"
                    onClick={async () => {
                      const reason = window.prompt(
                        "What should the moderator review?",
                      );
                      if (!reason) return;
                      try {
                        await api("report", { videoId: v.id, reason });
                        flush();
                        setHidden((h) => [...h, v.id]);
                        setActive(0);
                        feed.current?.scrollTo({ top: 0 });
                        setMessage("Video hidden pending moderation.");
                      } catch (e) {
                        setMessage((e as Error).message);
                      }
                    }}
                  >
                    <Flag />
                    <span>Report</span>
                  </button>
                </div>
                {i === active && blocked && (
                  <button
                    className="reel-autoplay-help"
                    type="button"
                    onClick={() =>
                      void players.current[i]
                        ?.play()
                        .catch(() =>
                          setMessage(
                            "Your browser blocked playback. Check its media permissions.",
                          ),
                        )
                    }
                  >
                    Resume playback
                  </button>
                )}
              </article>
            ))}
            {!filtered.length && (
              <div className="empty">No videos available.</div>
            )}
          </div>
          <div className="reel-navigation">
            <button
              type="button"
              aria-label="Previous video"
              disabled={active === 0}
              onClick={() => scrollTo(active - 1)}
            >
              <ChevronUp />
            </button>
            <button
              type="button"
              aria-label="Next video"
              disabled={active >= filtered.length - 1}
              onClick={() => scrollTo(active + 1)}
            >
              <ChevronDown />
            </button>
          </div>
        </div>
      )}
      <p role="status" className="shorts-status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
