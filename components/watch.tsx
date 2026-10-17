"use client";
import { Text } from "@/components/translation";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Button, EmptyState } from "./ui";
type Video = {
  id: string;
  title: string;
  creator: string;
  youtubeId: string;
  category: string;
};
export function WatchFeed({ videos }: { videos: Video[] }) {
  const [index, setIndex] = useState(0);
  const [limit, setLimit] = useState(300);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const segment = useRef(0);
  const touch = useRef(0);
  const filtered = videos.filter((v) => !category || v.category === category);
  const v = filtered[index];
  const done = seconds >= limit;
  useEffect(() => {
    if (!playing || done) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        setSeconds((s) => s + 1);
        segment.current++;
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, done]);
  useEffect(() => {
    if (!v || !playing) return;
    const id = v.id;
    const timer = setInterval(() => {
      const n = segment.current;
      if (n > 0) {
        segment.current = 0;
        void api("watch", { videoId: id, seconds: Math.min(600, n) }).catch(
          () => setMessage("Watch time could not be saved."),
        );
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [v, playing]);
  async function persist() {
    if (v && segment.current) {
      const n = segment.current;
      segment.current = 0;
      try {
        await api("watch", { videoId: v.id, seconds: Math.min(600, n) });
      } catch {
        setMessage("Watch time could not be saved.");
      }
    }
  }
  async function next(delta: number) {
    await persist();
    setPlaying(false);
    setIndex((i) => Math.max(0, Math.min(filtered.length - 1, i + delta)));
  }
  if (!videos.length)
    return (
      <EmptyState title="A little curiosity is on its way.">
        <Text value="No educational videos have been approved yet. We’ll keep this space intentional, with a finite, reviewed collection instead of an endless feed." />
      </EmptyState>
    );
  return (
    <>
      <div className="filters">
        <label>
          <Text value="Viewing session" />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={300}>
              <Text value="5 minutes" />
            </option>
            <option value={600}>
              <Text value="10 minutes" />
            </option>
          </select>
        </label>
        <label>
          <Text value="Topic" />
          <select
            value={category}
            onChange={async (e) => {
              await persist();
              setCategory(e.target.value);
              setIndex(0);
              setPlaying(false);
            }}
          >
            <option value="">
              <Text value="All approved topics" />
            </option>
            {[...new Set(videos.map((v) => v.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <span className="pill">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} /{" "}
          {limit / 60}
          <Text value="min" />
        </span>
      </div>
      {done ? (
        <div className="empty">
          <h2>
            <Text value="Your learning break is complete." />
          </h2>
          <p>
            <Text value="Ready to continue your preparation?" />
          </p>
          <div className="controls">
            <Button href="/dashboard">
              <Text value="Return to study →" />
            </Button>
          </div>
        </div>
      ) : v ? (
        <div className="video-feed">
          <div
            onTouchStart={(e) => (touch.current = e.touches[0].clientY)}
            onTouchEnd={(e) => {
              const d = touch.current - e.changedTouches[0].clientY;
              if (Math.abs(d) > 60) void next(d > 0 ? 1 : -1);
            }}
          >
            {playing ? (
              <iframe
                title={v.title}
                className="video-frame"
                src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}?autoplay=1&rel=0&cc_load_policy=1`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div
                className="empty"
                style={{
                  aspectRatio: "9/16",
                  display: "grid",
                  alignContent: "center",
                }}
              >
                <span className="big-spark">▷</span>
                <Button onClick={() => setPlaying(true)}>
                  <Text value="Play this video" />
                </Button>
                <p className="section-gap">
                  <Text value="The provider loads only when you choose to play." />
                </p>
              </div>
            )}
          </div>
          <div className="card">
            <span className="badge">{v.category}</span>
            <h2 className="section-gap" style={{ fontSize: 26 }}>
              {v.title}
            </h2>
            <p>
              <Text value="By" />
              {v.creator}
            </p>
            <p>
              <Text value="Video" />
              {index + 1}
              <Text value="of" />
              {filtered.length}
              <Text value=". A finite collection for a thoughtful break." />
            </p>
            <div className="form-grid">
              <Button
                secondary
                onClick={async () => {
                  await persist();
                  setPlaying(!playing);
                }}
              >
                {playing ? "Stop player" : "Play video"}
              </Button>
              <Button
                secondary
                onClick={async () => {
                  try {
                    await api("video-bookmark", {
                      videoId: v.id,
                      saved: !saved[v.id],
                    });
                    setSaved((s) => ({ ...s, [v.id]: !s[v.id] }));
                    setMessage("Bookmark updated.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                {saved[v.id] ? "★ Saved" : "☆ Bookmark"}
              </Button>
              <a
                className="text-link"
                href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Text value="Creator’s original video ↗" />
              </a>
              <Button
                secondary
                onClick={async () => {
                  const reason = window.prompt(
                    "What should the moderator review?",
                  );
                  if (reason)
                    try {
                      await api("report", { videoId: v.id, reason });
                      setMessage("Report sent to the moderation queue.");
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                }}
              >
                <Text value="Report a concern" />
              </Button>
            </div>
            <div className="controls">
              <Button secondary disabled={index === 0} onClick={() => next(-1)}>
                <Text value="← Previous" />
              </Button>
              <Button
                disabled={index === filtered.length - 1}
                onClick={() => next(1)}
              >
                <Text value="Next →" />
              </Button>
            </div>
            {index === filtered.length - 1 && (
              <p className="notice section-gap">
                <Text value="You’ve reached the end of this collection. A good place to return to study." />
              </p>
            )}
            <p role="status">{message}</p>
            <Button href="/dashboard" secondary>
              <Text value="Return to study" />
            </Button>
            <p className="section-gap" style={{ fontSize: 10 }}>
              <Text value="Session time counts visible player time, including provider pauses. Playback, captions, and volume use the provider’s controls." />
            </p>
          </div>
        </div>
      ) : (
        <EmptyState title="No videos in this topic">
          <Text value="Choose another category." />
        </EmptyState>
      )}
    </>
  );
}
