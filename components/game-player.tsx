"use client";
import { Text } from "@/components/translation";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import {
  shuffled,
  randomPatternTile,
  moveBoard,
  addTile,
  canMove,
  shuffledSliding,
  slidingMoves,
} from "@/lib/games";
import { Button } from "./ui";

export function GamePlayer({
  game,
  returnTo,
}: {
  game: string;
  returnTo?: string;
}) {
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [difficulty, setDifficulty] = useState(8);
  const [board, setBoard] = useState<number[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [lit, setLit] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [history, setHistory] = useState<{ board: number[]; score: number }[]>(
    [],
  );
  const touch = useRef<{ x: number; y: number } | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { data: session } = useSession();
  useEffect(() => {
    if (!started || paused || finished) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, paused, finished]);
  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (started)
      localStorage.setItem(
        `mm-game-${game}`,
        JSON.stringify({ board, score, seconds, moves, matched, difficulty }),
      );
  }, [board, score, seconds, moves, matched, difficulty, started, game]);
  function finish(value: number) {
    setScore(value);
    setFinished(true);
    setStatus("Lovely work. A little play, a fresh start. ✦");
  }
  function showSequence(seq: number[]) {
    setPlaying(true);
    setInputIndex(0);
    seq.forEach((n, i) => {
      timeouts.current.push(
        setTimeout(() => setLit(n), i * 700 + 500),
        setTimeout(() => setLit(-1), i * 700 + 950),
      );
    });
    timeouts.current.push(
      setTimeout(
        () => {
          setPlaying(false);
          setStatus("Your turn. Follow the pattern.");
        },
        seq.length * 700 + 400,
      ),
    );
  }
  function start(resume = false) {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setStarted(true);
    setFinished(false);
    setPaused(false);
    setSeconds(0);
    setMoves(0);
    setScore(0);
    setOpen([]);
    setMatched([]);
    setHistory([]);
    setStatus("");
    if (resume) {
      try {
        const v = JSON.parse(localStorage.getItem(`mm-game-${game}`) ?? "null");
        if (v && Array.isArray(v.board) && v.board.length) {
          setBoard(v.board);
          setScore(v.score);
          setSeconds(v.seconds);
          setMoves(v.moves);
          setMatched(v.matched);
          setDifficulty(v.difficulty);
          if (game !== "pattern-pulse") return;
        }
      } catch {}
    }
    if (game === "memory-match")
      setBoard(
        shuffled(
          Array.from({ length: difficulty * 2 }, (_, i) => i % difficulty),
        ),
      );
    if (game === "number-merge") setBoard(addTile(addTile(Array(16).fill(0))));
    if (game === "sliding-puzzle") setBoard(shuffledSliding());
    if (game === "pattern-pulse") {
      const seq = [randomPatternTile()];
      setSequence(seq);
      showSequence(seq);
    }
  }
  const move = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (paused || finished || !started || game !== "number-merge") return;
      const r = moveBoard(board, direction);
      if (!r.changed) return;
      setHistory((h) => [...h.slice(-19), { board: [...board], score }]);
      const next = addTile(r.board);
      setBoard(next);
      setScore((s) => s + r.score);
      setMoves((m) => m + 1);
      if (!canMove(next)) {
        setFinished(true);
        setStatus("That’s a wrap. Every move was a little practice.");
      }
    },
    [board, paused, finished, started, game, score],
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      if (map[e.key] && game === "number-merge") {
        e.preventDefault();
        move(map[e.key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move, game]);
  function flip(i: number) {
    if (
      paused ||
      finished ||
      open.length === 2 ||
      open.includes(i) ||
      matched.includes(i)
    )
      return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      if (board[next[0]] === board[next[1]]) {
        const found = [...matched, ...next];
        setMatched(found);
        setOpen([]);
        if (found.length === board.length)
          finish(Math.max(10, 1000 - (moves + 1) * 10));
      } else timeouts.current.push(setTimeout(() => setOpen([]), 850));
    }
  }
  function pulse(n: number) {
    if (playing || paused || finished) return;
    setLit(n);
    timeouts.current.push(setTimeout(() => setLit(-1), 200));
    if (sequence[inputIndex] !== n) {
      finish(Math.max(0, sequence.length - 1));
      setStatus(
        "A fresh pattern is always waiting. Try again whenever you like.",
      );
      return;
    }
    if (inputIndex === sequence.length - 1) {
      setScore(sequence.length);
      setStatus("Beautiful. One more little spark…");
      const seq = [...sequence, randomPatternTile()];
      setSequence(seq);
      showSequence(seq);
    } else setInputIndex((i) => i + 1);
  }
  const symbols = ["✿", "✦", "☀", "☂", "♬", "☘", "☾", "♡", "✈", "♜", "❄", "⚑"];
  return (
    <div className="card">
      <div className="spread">
        <span className="badge">
          {paused
            ? "PAUSED"
            : finished
              ? "COMPLETE"
              : "YOUR LITTLE BRAIN BREAK"}
        </span>
        <span className="muted">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      {seconds >= 300 && (
        <p className="notice section-gap">
          <Text value="Feeling refreshed? Your learning space is right where you left it. You can return whenever you’re ready." />
        </p>
      )}
      {!started ? (
        <div className="empty">
          <span className="big-spark">✦</span>
          <h3>
            <Text value="Make a little room for play." />
          </h3>
          <p>
            <Text value="There’s no rush, no leaderboard. Just you and your next little challenge." />
          </p>
          {game === "memory-match" && (
            <label className="section-gap">
              <Text value="Choose your pace" />
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
              >
                <option value={6}>
                  <Text value="Gentle · 6 pairs" />
                </option>
                <option value={8}>
                  <Text value="Balanced · 8 pairs" />
                </option>
                <option value={12}>
                  <Text value="A little challenge · 12 pairs" />
                </option>
              </select>
            </label>
          )}
          <div className="controls">
            <Button onClick={() => start()}>
              <Text value="Let’s play →" />
            </Button>
            {game !== "pattern-pulse" && (
              <Button secondary onClick={() => start(true)}>
                <Text value="Resume saved game" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="spread section-gap">
            <strong>
              {game === "memory-match" || game === "sliding-puzzle"
                ? `Moves: ${moves}`
                : `Score: ${score}`}
            </strong>
            {game === "pattern-pulse" && (
              <span>
                <Text value="Round" />
                {sequence.length}
              </span>
            )}
            <button
              className="chip"
              disabled={playing}
              onClick={() => setPaused(!paused)}
            >
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
          <div
            className="game-board"
            onTouchStart={(e) =>
              (touch.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              })
            }
            onTouchEnd={(e) => {
              if (!touch.current) return;
              const dx = e.changedTouches[0].clientX - touch.current.x,
                dy = e.changedTouches[0].clientY - touch.current.y;
              if (Math.max(Math.abs(dx), Math.abs(dy)) > 25)
                move(
                  Math.abs(dx) > Math.abs(dy)
                    ? dx > 0
                      ? "right"
                      : "left"
                    : dy > 0
                      ? "down"
                      : "up",
                );
              touch.current = null;
            }}
          >
            {paused ? (
              <div className="empty">
                <h3>
                  <Text value="A moment to breathe." />
                </h3>
                <p>
                  <Text value="Press Resume when you’re ready." />
                </p>
              </div>
            ) : game === "memory-match" ? (
              <div className="memory-grid">
                {board.map((n, i) => (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    key={i}
                    aria-label={
                      matched.includes(i)
                        ? `Matched ${symbols[n]}`
                        : open.includes(i)
                          ? symbols[n]
                          : `Reveal card ${i + 1}`
                    }
                    disabled={matched.includes(i) || finished}
                    className={`memory-tile ${open.includes(i) ? "revealed" : ""} ${matched.includes(i) ? "matched" : ""}`}
                    onClick={() => flip(i)}
                  >
                    {open.includes(i) || matched.includes(i) ? symbols[n] : "✧"}
                  </motion.button>
                ))}
              </div>
            ) : game === "number-merge" ? (
              <div
                className="number-grid"
                role="group"
                aria-label="Number merge board"
              >
                {board.map((n, i) => (
                  <motion.div
                    layout
                    key={i}
                    className={`number-cell ${n ? "filled" : ""}`}
                    style={
                      n >= 16
                        ? { background: "var(--primary)", color: "white" }
                        : undefined
                    }
                  >
                    {n || ""}
                  </motion.div>
                ))}
              </div>
            ) : game === "pattern-pulse" ? (
              <div className="pattern-grid">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    aria-label={`Pattern tile ${n + 1}`}
                    className={lit === n ? "lit" : ""}
                    disabled={playing || finished}
                    onClick={() => pulse(n)}
                  />
                ))}
              </div>
            ) : (
              <div className="sliding-grid">
                {board.map((n, i) => (
                  <button
                    className={!n ? "blank" : ""}
                    key={i}
                    aria-label={n ? `Move tile ${n}` : "Empty space"}
                    disabled={!n || finished}
                    onClick={() => {
                      if (!slidingMoves(board).includes(i)) return;
                      const next = [...board],
                        blank = board.indexOf(0);
                      [next[blank], next[i]] = [next[i], next[blank]];
                      setBoard(next);
                      setMoves((m) => m + 1);
                      if (next.every((n, i) => n === (i + 1) % 9))
                        finish(Math.max(10, 1000 - moves * 5));
                    }}
                  >
                    {n || ""}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="game-status" aria-live="polite">
            {status}
          </p>
          {game === "number-merge" && !finished && (
            <>
              <p
                className="muted"
                style={{ textAlign: "center", fontSize: 12 }}
              >
                <Text value="Use arrow keys, swipe, or tap a direction. Equal tiles merge once per move." />
              </p>
              <div className="controls">
                {(["left", "up", "down", "right"] as const).map((d) => (
                  <Button
                    key={d}
                    secondary
                    onClick={() => move(d)}
                    aria-label={`Move ${d}`}
                  >
                    {{ left: "←", up: "↑", down: "↓", right: "→" }[d]}
                  </Button>
                ))}
                <Button
                  secondary
                  disabled={!history.length}
                  onClick={() => {
                    const prev = history.at(-1);
                    if (prev) {
                      setBoard(prev.board);
                      setScore(prev.score);
                      setHistory((h) => h.slice(0, -1));
                    }
                  }}
                >
                  <Text value="Undo" />
                </Button>
                <Button onClick={() => finish(score)}>
                  <Text value="Finish break" />
                </Button>
              </div>
            </>
          )}
          <div className="controls">
            <Button secondary onClick={() => start()}>
              <Text value="Start fresh" />
            </Button>
            {finished && session && (
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("games", {
                      game,
                      score,
                      duration: Math.max(1, seconds),
                    });
                    setStatus("Saved to your private game history. ✦");
                  } catch (e) {
                    setStatus((e as Error).message);
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Saved" : "Save my result"}
              </Button>
            )}
            {finished && !session && (
              <Button href="/login">
                <Text value="Sign in to save results" />
              </Button>
            )}
          </div>
        </>
      )}
      <div className="controls">
        <Link
          className="text-link"
          href={
            returnTo && /^\/practice\/[a-z0-9]+$/.test(returnTo)
              ? returnTo
              : "/dashboard"
          }
        >
          {returnTo
            ? "← Resume your practice"
            : "← Return to your learning space"}
        </Link>
      </div>
      <p
        className="muted"
        style={{ textAlign: "center", fontSize: 10, marginTop: 20 }}
      >
        <Text value="Games are for enjoyment and refreshing breaks. Scores are self-reported personal records." />
      </p>
    </div>
  );
}
