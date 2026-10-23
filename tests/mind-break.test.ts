import { describe, it, expect } from "vitest";
import {
  testBridge,
  beamCost,
  newFootball,
  footballMoves,
  footballMove,
  footballEdge,
  botMove,
  tossLanding,
  type Beam,
} from "../lib/mind-break";
describe("Mind Break game rules", () => {
  const deck: Beam[] = Array.from({ length: 6 }, (_, i) => ({
    a: 21 + i,
    b: 22 + i,
    material: "wood",
  }));
  const stable: Beam[] = [
    ...deck,
    ...Array.from({ length: 6 }, (_, i) => ({
      a: 14 + i,
      b: 15 + i,
      material: "wood" as const,
    })),
    ...Array.from({ length: 7 }, (_, i) => ({
      a: 14 + i,
      b: 21 + i,
      material: "wood" as const,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      a: 14 + i,
      b: 22 + i,
      material: "wood" as const,
    })),
  ];
  it("requires a road and rejects a folding unbraced deck", () => {
    expect(testBridge([]).passed).toBe(false);
    expect(testBridge(deck).passed).toBe(false);
  });
  it("supports a triangulated bridge and rejects excessive loads and budgets", () => {
    expect(testBridge(stable).passed).toBe(true);
    expect(testBridge(stable, 1000).passed).toBe(false);
    expect(testBridge(stable, 8, 100).passed).toBe(false);
    expect(stable.reduce((s, b) => s + beamCost(b), 0)).toBeLessThan(2400);
  });
  it("alternates turns on new interior points and cannot reuse an edge", () => {
    const s = newFootball(),
      n = footballMove(s, { x: 3, y: 3 });
    expect(n.turn).toBe(1);
    expect(footballMove(n, s.ball)).toBe(n);
  });
  it("bounces on a visited point", () => {
    const s = newFootball();
    s.visited.push("2,3");
    expect(footballMove(s, { x: 2, y: 3 }).turn).toBe(0);
  });
  it("counts goals and own goals by end of pitch", () => {
    const s = newFootball();
    s.ball = { x: 3, y: 1 };
    s.turn = 1;
    expect(footballMove(s, { x: 3, y: 0 }).winner).toBe(0);
    s.ball = { x: 3, y: 7 };
    expect(footballMove(s, { x: 3, y: 8 }).winner).toBe(1);
  });
  it("loses when trapped and bot chooses an immediate win", () => {
    const s = newFootball();
    s.ball = { x: 3, y: 7 };
    expect(botMove(s, true)).toEqual({ x: 3, y: 8 });
    const t = newFootball();
    t.ball = { x: 1, y: 1 };
    const target = { x: 2, y: 2 };
    t.edges = footballMoves({ ...newFootball(), ball: target })
      .filter((p) => p.x !== 1 || p.y !== 1)
      .map((p) => footballEdge(target, p));
    expect(footballMove(t, target).winner).toBe(0);
  });
  it("applies wind and power to paper ball landing", () => {
    expect(tossLanding(0, 70, 0)).toEqual({ x: 150, y: 140 });
    expect(tossLanding(0, 70, 2).x).toBe(174);
    expect(tossLanding(20, 70, 0).x).toBeGreaterThan(150);
  });
});
