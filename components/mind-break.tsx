"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  anchors,
  beamCost,
  bridgeNodes,
  testBridge,
  newFootball,
  footballMoves,
  footballMove,
  botMove,
  tossLanding,
  type Beam,
  type Point,
} from "@/lib/mind-break";
const instructions: Record<string, string[]> = {
  "paper-toss": [
    "Swipe upward from the paper ball. Direction sets aim and swipe length sets power. Mouse dragging works too.",
    "Land inside the basket rim. Wind pushes the ball sideways. Use the aim and power sliders as an accessible alternative.",
    "You get five throws. Each basket scores one point. Practice has no throw limit; restart whenever you like.",
  ],
  "bridge-builder": [
    "Tap two grid points to connect them. Build the road across row 4 between the red anchors, one segment at a time.",
    "Wood costs 60 per grid unit; steel costs 130 and carries more load. Triangles keep the bridge from folding. Crossed beams join only at their endpoints.",
    "Stay within the budget and press Test crossing. The simplified truss model checks stability, bending and member load at each road point. Fewer materials earn more stars.",
  ],
  "paper-football": [
    "You are blue and attack the TOP goal. The bot attacks the bottom goal. Tap a highlighted neighbour or swipe in one of eight directions.",
    "Every move joins adjacent points. An edge can be used only once. Landing on a visited point or wall gives another move; a new interior point ends your turn.",
    "This compact grid variant has one-point goals. You cannot travel along a wall. Crossing diagonals is allowed without a bounce at their crossing. Score in your goal to win; an own goal loses. A player trapped on their turn loses.",
  ],
};
export function MindBreak({
  game,
  returnTo,
}: {
  game: string;
  returnTo?: string;
}) {
  const [rules, setRules] = useState(true),
    [step, setStep] = useState(0),
    [paused, setPaused] = useState(false),
    [practice, setPractice] = useState(false),
    [round, setRound] = useState(0),
    [seconds, setSeconds] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (paused || rules) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused, rules]);
  const back =
    returnTo?.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/dashboard";
  return (
    <section className="mind-break">
      <div className="break-toolbar">
        <Link className="chip" href="/games">
          ← All games
        </Link>
        <button className="chip" onClick={() => setRules(!rules)}>
          Rules
        </button>
        <button className="chip" onClick={() => setPaused(!paused)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          className="chip"
          onClick={() => {
            setRound((r) => r + 1);
            setSeconds(0);
          }}
        >
          Restart
        </button>
      </div>
      {rules && (
        <section
          className="break-rules"
          aria-label="How to play"
          onPointerDown={(e) => {
            start.current = e.clientX;
          }}
          onPointerUp={(e) => {
            const dx = e.clientX - start.current;
            if (Math.abs(dx) > 45)
              setStep((s) => Math.max(0, Math.min(2, s + (dx < 0 ? 1 : -1))));
          }}
        >
          <span className="eyebrow">HOW TO PLAY · {step + 1} / 3</span>
          <h2>
            {["Make your first move", "Learn the rules", "Play your way"][step]}
          </h2>
          <p>{instructions[game][step]}</p>
          <div className="break-toolbar">
            <button
              className="chip"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              Previous
            </button>
            <button
              className="chip"
              disabled={step === 2}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </button>
            <button
              className="button"
              onClick={() => {
                setPractice(false);
                setRules(false);
                setRound((r) => r + 1);
              }}
            >
              Play round
            </button>
            <button
              className="chip"
              onClick={() => {
                setPractice(true);
                setRules(false);
                setRound((r) => r + 1);
              }}
            >
              Practice round
            </button>
          </div>
          <small>Swipe these cards, or use Previous / Next.</small>
        </section>
      )}
      {paused && (
        <p className="notice" role="status">
          Paused. Your game is saved for this visit.
        </p>
      )}
      <div
        inert={paused || rules}
        className={paused || rules ? "break-paused" : ""}
      >
        {game === "paper-toss" ? (
          <Toss key={round} paused={paused || rules} practice={practice} />
        ) : game === "bridge-builder" ? (
          <Bridge key={round} paused={paused || rules} practice={practice} />
        ) : (
          <Football key={round} paused={paused || rules} practice={practice} />
        )}
      </div>
      {seconds >= 300 && (
        <p className="notice">
          Five-minute reset complete. Ready for your next study session?
        </p>
      )}
      <Link className="button secondary section-gap" href={back}>
        Back to study ↗
      </Link>
    </section>
  );
}
function Toss({ paused, practice }: { paused: boolean; practice: boolean }) {
  const [angle, setAngle] = useState(0),
    [power, setPower] = useState(70),
    [shots, setShots] = useState(0),
    [score, setScore] = useState(0),
    [wind, setWind] = useState(0),
    [flight, setFlight] = useState<{
      end: Point;
      t: number;
      hit: boolean;
    } | null>(null),
    [message, setMessage] = useState(
      "Swipe up from the paper ball, or set aim and power below.",
    );
  const drag = useRef<Point | null>(null);
  useEffect(() => {
    if (!flight || paused) return;
    const timer = setTimeout(() => {
      if (flight.t >= 0.95) {
        setScore((s) => s + (flight.hit ? 1 : 0));
        setShots((s) => s + 1);
        setMessage(
          flight.hit
            ? "In the basket! +1"
            : "Missed. Adjust your aim or power and try again.",
        );
        setFlight(null);
        setWind((w) => (w === 0 ? 2 : w === 2 ? -2 : 0));
      } else setFlight({ ...flight, t: flight.t + 0.05 });
    }, 40);
    return () => clearTimeout(timer);
  }, [flight, paused]);
  function launch(a = angle, p = power) {
    if (flight || paused || (!practice && shots >= 5)) return;
    const end = tossLanding(a, p, wind);
    setFlight({
      end,
      t: 0,
      hit: Math.hypot((end.x - 150) / 30, (end.y - 140) / 19) <= 1,
    });
    setMessage("Paper in flight…");
  }
  const f = flight,
    t = f?.t ?? 0,
    x = f ? 150 + (f.end.x - 150) * t : 150,
    y = f ? 350 + (f.end.y - 350) * t - 110 * Math.sin(Math.PI * t) : 350;
  return (
    <>
      <div className="break-score">
        <strong>
          {practice ? "Practice" : `Throw ${Math.min(shots + 1, 5)} / 5`}
        </strong>
        <span>Score {score}</span>
        <span>
          Wind {wind === 0 ? "calm" : wind > 0 ? "→" : "←"} {Math.abs(wind)}
        </span>
      </div>
      <svg
        className="break-board toss-board"
        viewBox="0 0 300 400"
        role="img"
        aria-label="Paper ball and basket. Use the controls below or swipe upward."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          drag.current = {
            x: ((e.clientX - r.left) * 300) / r.width,
            y: ((e.clientY - r.top) * 400) / r.height,
          };
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          const r = e.currentTarget.getBoundingClientRect(),
            dx = ((e.clientX - r.left) * 300) / r.width - d.x,
            dy = d.y - ((e.clientY - r.top) * 400) / r.height;
          if (dy < 15) return;
          const a = Math.max(
              -40,
              Math.min(40, (Math.atan2(dx, dy) * 180) / Math.PI),
            ),
            p = Math.max(20, Math.min(100, Math.hypot(dx, dy) / 2));
          setAngle(a);
          setPower(p);
          launch(a, p);
        }}
      >
        <rect width="300" height="400" rx="24" fill="#eaf3e8" />
        <path d="M0 290H300" stroke="#c6d9bf" />
        <text x="150" y="40" textAnchor="middle" fill="#2c5144" fontSize="15">
          A little aim. A fresh start.
        </text>
        <path
          d="M120 140L132 205H168L180 140"
          fill="#deb786"
          stroke="#795c39"
          strokeWidth="3"
        />
        {[135, 150, 165].map((v) => (
          <path
            key={v}
            d={`M${v} 145L${150 + (v - 150) * 0.7} 200`}
            stroke="#795c39"
          />
        ))}
        <ellipse
          cx="150"
          cy="140"
          rx="30"
          ry="19"
          fill="#4b6652"
          stroke="#795c39"
          strokeWidth="4"
        />
        <ellipse cx={x} cy="365" rx={14 - 5 * t} ry="4" fill="#0002" />
        <circle
          cx={x}
          cy={y}
          r={14 - 5 * t}
          fill="white"
          stroke="#698174"
          strokeWidth="2"
        />
        <path
          d={`M${x - 6} ${y - 8}l8 8-7 7m7-7 7-4`}
          fill="none"
          stroke="#bac8bd"
        />
      </svg>
      <p role="status">
        {!practice && shots >= 5
          ? `Round complete: ${score} / 5 baskets. Restart for another round.`
          : message}
      </p>
      <div className="break-controls">
        <label>
          Aim {Math.round(angle)}°
          <input
            type="range"
            min="-40"
            max="40"
            value={angle}
            onChange={(e) => setAngle(+e.target.value)}
          />
        </label>
        <label>
          Power {Math.round(power)}
          <input
            type="range"
            min="20"
            max="100"
            value={power}
            onChange={(e) => setPower(+e.target.value)}
          />
        </label>
        <button
          className="button"
          disabled={!!flight || (!practice && shots >= 5)}
          onClick={() => launch()}
        >
          Throw paper
        </button>
      </div>
    </>
  );
}
function Bridge({ paused, practice }: { paused: boolean; practice: boolean }) {
  const [beams, setBeams] = useState<Beam[]>([]),
    [redo, setRedo] = useState<Beam[]>([]),
    [selected, setSelected] = useState<number | null>(null),
    [material, setMaterial] = useState<"wood" | "steel">("wood"),
    [level, setLevel] = useState(1),
    [result, setResult] = useState<ReturnType<typeof testBridge> | null>(null),
    [progress, setProgress] = useState(0);
  const budget = 2400,
    load = level === 1 ? 8 : 12,
    cost = beams.reduce((s, b) => s + beamCost(b), 0);
  useEffect(() => {
    if (!result?.passed || paused || progress >= 1) return;
    const t = setInterval(() => setProgress((p) => Math.min(1, p + 0.025)), 50);
    return () => clearInterval(t);
  }, [result, paused, progress]);
  function connect(i: number) {
    setResult(null);
    setProgress(0);
    if (selected === null) {
      setSelected(i);
      return;
    }
    if (
      selected !== i &&
      !beams.some(
        (b) => [b.a, b.b].includes(i) && [b.a, b.b].includes(selected),
      )
    ) {
      const b: Beam = { a: selected, b: i, material };
      if (
        Math.hypot(
          bridgeNodes[i].x - bridgeNodes[selected].x,
          bridgeNodes[i].y - bridgeNodes[selected].y,
        ) > 2.25
      ) {
        setResult({
          passed: false,
          message:
            "Use shorter members: connect points no more than two grid spaces apart.",
          weak: [],
          stars: 0,
        });
      } else if (cost + beamCost(b) > budget) {
        setResult({
          passed: false,
          message:
            "That beam exceeds your budget. Undo a beam or switch material.",
          weak: [],
          stars: 0,
        });
      } else {
        setBeams([...beams, b]);
        setRedo([]);
      }
    }
    setSelected(null);
  }
  return (
    <>
      <div className="break-score">
        <strong>
          Level {level} · {practice ? "Practice" : "River crossing"}
        </strong>
        <span>
          {cost} / {budget} coins
        </span>
        <span>{result?.passed ? "★".repeat(result.stars) : "☆ ☆ ☆"}</span>
      </div>
      <div className="bridge-scene">
        <div className="bridge-sky" aria-hidden="true">
          ☁ <span>☀</span> ☁
        </div>
        <svg viewBox="0 0 420 280" className="bridge-lines" aria-hidden="true">
          <path d="M0 194H30V280H0M390 194H420V280H390" fill="#b88b59" />
          <path d="M30 253Q120 235 210 253T390 253V280H30" fill="#5fb4cc" />
          {beams.map((b, i) => (
            <line
              key={i}
              x1={30 + bridgeNodes[b.a].x * 60}
              y1={30 + bridgeNodes[b.a].y * 55}
              x2={30 + bridgeNodes[b.b].x * 60}
              y2={30 + bridgeNodes[b.b].y * 55}
              stroke={
                result?.weak.includes(i)
                  ? "#d53b4d"
                  : b.material === "wood"
                    ? "#9a673d"
                    : "#64748b"
              }
              strokeWidth={b.material === "wood" ? 5 : 8}
            />
          ))}
          <text x={12 + progress * 360} y="187" fontSize="27">
            🚙
          </text>
        </svg>
        <div className="bridge-grid">
          {bridgeNodes.map((p, i) => (
            <button
              key={i}
              className={`bridge-node ${anchors.includes(i) ? "anchor" : ""} ${selected === i ? "selected" : ""} ${p.y === 3 ? "road" : ""}`}
              aria-label={`Point ${p.x + 1}, ${p.y + 1}${anchors.includes(i) ? ", anchor" : ""}${p.y === 3 ? ", road" : ""}`}
              aria-pressed={selected === i}
              onClick={() => connect(i)}
            />
          ))}
        </div>
      </div>
      <p role="status">
        {result?.message ??
          (selected === null
            ? "Select two points. Row 4 is the road; red points are fixed anchors."
            : "Choose the second endpoint.")}
      </p>
      <div className="break-toolbar">
        <button
          className="chip"
          aria-pressed={material === "wood"}
          onClick={() => setMaterial("wood")}
        >
          Wood · 60/unit
        </button>
        <button
          className="chip"
          aria-pressed={material === "steel"}
          onClick={() => setMaterial("steel")}
        >
          Steel · 130/unit
        </button>
        <button
          className="chip"
          disabled={!beams.length}
          onClick={() => {
            setRedo([...redo, beams[beams.length - 1]]);
            setBeams(beams.slice(0, -1));
            setResult(null);
            setProgress(0);
          }}
        >
          Undo
        </button>
        <button
          className="chip"
          disabled={!redo.length}
          onClick={() => {
            setBeams([...beams, redo[redo.length - 1]]);
            setRedo(redo.slice(0, -1));
            setResult(null);
            setProgress(0);
          }}
        >
          Redo
        </button>
        <button
          className="chip"
          onClick={() => {
            setBeams([]);
            setRedo([]);
            setSelected(null);
            setResult(null);
            setProgress(0);
          }}
        >
          Clear
        </button>
        <button
          className="button"
          onClick={() => {
            setSelected(null);
            setProgress(0);
            setResult(testBridge(beams, load, budget));
          }}
        >
          ▶ Test crossing
        </button>
        {result?.passed && progress >= 1 && (
          <button
            className="chip"
            onClick={() => {
              setLevel(level === 1 ? 2 : 1);
              setResult(null);
              setProgress(0);
            }}
          >
            Try {level === 1 ? "heavier" : "lighter"} car
          </button>
        )}
      </div>
      <details className="notice">
        <summary>Need a building hint?</summary>Connect all road points on row
        4. Add another horizontal row above it, then vertical and diagonal
        members to form triangles. Connect the ends to the anchors. Keep each
        member short.
      </details>
    </>
  );
}
function Football({
  paused,
  practice,
}: {
  paused: boolean;
  practice: boolean;
}) {
  const [state, setState] = useState(newFootball),
    [hard, setHard] = useState(true);
  const drag = useRef<Point | null>(null);
  const moves = footballMoves(state);
  useEffect(() => {
    if (paused || state.turn !== 1 || state.winner !== null) return;
    const timer = setTimeout(() => {
      const next = botMove(state, hard);
      if (next) setState(footballMove(state, next));
    }, 650);
    return () => clearTimeout(timer);
  }, [state, paused, hard]);
  function move(p: Point) {
    if (state.turn === 0 && !paused) setState((s) => footballMove(s, p));
  }
  return (
    <>
      <div className="break-score">
        <strong>{practice ? "Practice · " : ""}You ↑ · Bot ↓</strong>
        <label>
          Bot{" "}
          <select
            aria-label="Bot difficulty"
            value={hard ? "normal" : "easy"}
            onChange={(e) => setHard(e.target.value === "normal")}
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
          </select>
        </label>
      </div>
      <p role="status">
        {state.winner !== null
          ? state.winner === 0
            ? "You win! Restart for a rematch."
            : "Bot wins. Restart and try another route."
          : state.turn === 0
            ? "Your move. Tap a glowing point or swipe."
            : "Bot is thinking…"}
      </p>
      <div
        className="football-board"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (Math.hypot(dx, dy) < 25) return;
          const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
          move({
            x: state.ball.x + Math.round(Math.cos((angle * Math.PI) / 4)),
            y: state.ball.y + Math.round(Math.sin((angle * Math.PI) / 4)),
          });
        }}
      >
        <svg viewBox="0 0 300 380" aria-hidden="true">
          <rect
            x="30"
            y="30"
            width="240"
            height="320"
            rx="4"
            fill="none"
            stroke="#8eb7a6"
            strokeWidth="3"
          />
          <text x="150" y="19" textAnchor="middle" fill="#1465a0" fontSize="12">
            YOUR GOAL
          </text>
          <text
            x="150"
            y="374"
            textAnchor="middle"
            fill="#a65a20"
            fontSize="12"
          >
            BOT GOAL
          </text>
          {state.edges.map((edge) => {
            const [a, b] = edge.split("|").map((v) => v.split(",").map(Number));
            return (
              <line
                key={edge}
                x1={30 + a[0] * 40}
                y1={30 + a[1] * 40}
                x2={30 + b[0] * 40}
                y2={30 + b[1] * 40}
                stroke="#719b8b"
                strokeWidth="3"
              />
            );
          })}
          <circle
            cx={30 + state.ball.x * 40}
            cy={30 + state.ball.y * 40}
            r="10"
            fill="#1c6ca0"
            stroke="white"
            strokeWidth="3"
          />
        </svg>
        <div className="football-grid">
          {Array.from({ length: 63 }, (_, i) => {
            const p = { x: i % 7, y: Math.floor(i / 7) },
              legal = moves.some((q) => q.x === p.x && q.y === p.y);
            return (
              <button
                key={i}
                className={legal && state.turn === 0 ? "football-available" : ""}
                disabled={!legal || state.turn !== 0}
                aria-label={`Move to column ${p.x + 1}, row ${p.y + 1}`}
                onClick={() => move(p)}
              />
            );
          })}
        </div>
      </div>
      <p className="muted">
        Blue attacks upward. Glowing points are legal moves. You can use Tab and
        Enter instead of swiping.
      </p>
    </>
  );
}
