export type Point = { x: number; y: number };
export type Beam = { a: number; b: number; material: "wood" | "steel" };
export const bridgeNodes: Point[] = Array.from({ length: 35 }, (_, i) => ({
  x: i % 7,
  y: Math.floor(i / 7),
}));
export const anchors = [21, 27, 28, 34];
export const beamCost = (b: Beam) =>
  Math.round(
    Math.hypot(
      bridgeNodes[b.a].x - bridgeNodes[b.b].x,
      bridgeNodes[b.a].y - bridgeNodes[b.b].y,
    ) * (b.material === "wood" ? 60 : 130),
  );
function solve(a: number[][], b: number[]) {
  const n = b.length,
    m = a.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let j = i + 1; j < n; j++)
      if (Math.abs(m[j][i]) > Math.abs(m[p][i])) p = j;
    if (Math.abs(m[p][i]) < 1e-8) return null;
    [m[p], m[i]] = [m[i], m[p]];
    const d = m[i][i];
    for (let k = i; k <= n; k++) m[i][k] /= d;
    for (let j = 0; j < n; j++)
      if (j !== i) {
        const f = m[j][i];
        for (let k = i; k <= n; k++) m[j][k] -= f * m[i][k];
      }
  }
  return m.map((r) => r[n]);
}
export function testBridge(beams: Beam[], load = 8, budget = 2400) {
  const fail = (message: string, weak: number[] = []) => ({
    passed: false,
    message,
    weak,
    stars: 0,
  });
  const cost = beams.reduce((s, b) => s + beamCost(b), 0);
  if (cost > budget)
    return fail("Over budget. Remove expensive beams or use wood.");
  for (let x = 0; x < 6; x++)
    if (
      !beams.some(
        (b) => Math.min(b.a, b.b) === 21 + x && Math.max(b.a, b.b) === 22 + x,
      )
    )
      return fail(
        "Build a continuous road across row 4. Connect every adjacent road point.",
      );
  const active = [...new Set(beams.flatMap((b) => [b.a, b.b]))];
  const free = active.filter((n) => !anchors.includes(n));
  const dofs = free.flatMap((n) => [n * 2, n * 2 + 1]);
  const k = dofs.map(() => dofs.map(() => 0));
  const geometry = beams.map((b) => {
    const a = bridgeNodes[b.a],
      z = bridgeNodes[b.b];
    const l = Math.hypot(z.x - a.x, z.y - a.y),
      c = (z.x - a.x) / l,
      s = (z.y - a.y) / l;
    const v = [-c, -s, c, s],
      ids = [b.a * 2, b.a * 2 + 1, b.b * 2, b.b * 2 + 1],
      stiffness = (b.material === "wood" ? 300 : 900) / l;
    ids.forEach((di, i) =>
      ids.forEach((dj, j) => {
        const ii = dofs.indexOf(di),
          jj = dofs.indexOf(dj);
        if (ii >= 0 && jj >= 0) k[ii][jj] += stiffness * v[i] * v[j];
      }),
    );
    return { v, ids, stiffness };
  });
  const weak = new Set<number>();
  for (let road = 22; road <= 26; road++) {
    const forces = dofs.map((d) => (d === road * 2 + 1 ? load : 0));
    const u = solve(k, forces);
    if (!u)
      return fail(
        "The bridge can fold. Add diagonal beams to make triangles connected to the red anchors.",
      );
    geometry.forEach((g, i) => {
      const force = Math.abs(
        g.stiffness *
          g.ids.reduce((s, d, j) => s + g.v[j] * (u[dofs.indexOf(d)] ?? 0), 0),
      );
      if (force > (beams[i].material === "wood" ? 14 : 38)) weak.add(i);
    });
    if (Math.max(...u.map(Math.abs)) > 0.35)
      return fail(
        "Too much bending. Shorten unsupported spans or strengthen the triangles.",
        [...weak],
      );
  }
  if (weak.size)
    return fail(
      "Highlighted beams exceed their load limit. Add supports or replace them with steel.",
      [...weak],
    );
  return {
    passed: true,
    message: "Stable crossing! Your bridge carried the car.",
    weak: [],
    stars: cost < budget * 0.65 ? 3 : cost < budget * 0.85 ? 2 : 1,
  };
}
export const footballEdge = (a: Point, b: Point) =>
  [[a.x, a.y].join(","), [b.x, b.y].join(",")].sort().join("|");
export const boundary = (p: Point) =>
  p.x === 0 || p.x === 6 || p.y === 0 || p.y === 8;
export const goal = (p: Point) => p.x === 3 && (p.y === 0 || p.y === 8);
export type Football = {
  ball: Point;
  edges: string[];
  visited: string[];
  turn: 0 | 1;
  winner: 0 | 1 | null;
};
export const newFootball = (): Football => ({
  ball: { x: 3, y: 4 },
  edges: [],
  visited: ["3,4"],
  turn: 0,
  winner: null,
});
export function footballMoves(s: Football) {
  if (s.winner !== null) return [];
  const out: Point[] = [];
  for (let y = -1; y <= 1; y++)
    for (let x = -1; x <= 1; x++) {
      if (!x && !y) continue;
      const p = { x: s.ball.x + x, y: s.ball.y + y };
      if (p.x < 0 || p.x > 6 || p.y < 0 || p.y > 8) continue;
      if (boundary(s.ball) && boundary(p) && !goal(p)) continue;
      if (!s.edges.includes(footballEdge(s.ball, p))) out.push(p);
    }
  return out;
}
export function footballMove(s: Football, p: Point): Football {
  if (!footballMoves(s).some((q) => q.x === p.x && q.y === p.y)) return s;
  const key = `${p.x},${p.y}`,
    bounce = boundary(p) || s.visited.includes(key);
  const next: Football = {
    ball: p,
    edges: [...s.edges, footballEdge(s.ball, p)],
    visited: [...s.visited, key],
    turn: bounce ? s.turn : s.turn === 0 ? 1 : 0,
    winner: goal(p) ? (p.y === 0 ? 0 : 1) : null,
  };
  if (next.winner === null && !footballMoves(next).length)
    next.winner = next.turn === 0 ? 1 : 0;
  return next;
}
export function botMove(s: Football, hard: boolean) {
  const moves = footballMoves(s);
  if (!hard) return moves[Math.floor(Math.random() * moves.length)];
  return moves.sort((a, b) => score(b) - score(a))[0];
  function score(p: Point) {
    const n = footballMove(s, p);
    if (n.winner !== null) return n.winner === 1 ? 1000 : -1000;
    const replies = footballMoves(n);
    if (n.turn === 0 && replies.some((q) => footballMove(n, q).winner === 0))
      return -500;
    return (
      p.y * 10 - Math.abs(p.x - 3) * 2 + (n.turn === 1 ? 4 : 0) + replies.length
    );
  }
}
export function tossLanding(angle: number, power: number, wind: number) {
  const r = (angle * Math.PI) / 180;
  return {
    x: 150 + Math.sin(r) * power * 2.5 + wind * 12,
    y: 350 - Math.cos(r) * power * 3,
  };
}
