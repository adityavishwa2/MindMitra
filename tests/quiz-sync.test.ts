import { expect, it } from "vitest";
import { pendingDrain, readCachedAnswers } from "../lib/quiz-sync";

it("waits for an in-flight save and drains newer edits before submit", async () => {
  const pending: Record<string, number> = { q: 1 };
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const saved: number[] = [];
  const drain = pendingDrain(() => pending, async (_id, value) => {
    saved.push(value);
    if (value === 1) await gate;
  });
  const first = drain();
  pending.q = 2;
  const submit = drain();
  expect(submit).toBe(first);
  release();
  await submit;
  expect(saved).toEqual([1, 2]);
  expect(pending).toEqual({});
});

it("retains failed answers and allows retry", async () => {
  const pending = { q: 1 } as Record<string, number>;
  let fail = true;
  const drain = pendingDrain(() => pending, async () => {
    if (fail) throw Error("offline");
  });
  await expect(drain()).rejects.toThrow("offline");
  expect(pending.q).toBe(1);
  fail = false;
  await drain();
  expect(pending).toEqual({});
});

const questions = [{ id: "q", type: "MSQ", options: ["A", "B"] }];
it("ignores damaged caches and invalid selections without losing valid answers", () => {
  for (const raw of ["null", "[]", "bad json", '{"q":null}', '{"q":{"selected":null,"selectedOptions":"bad","reviewed":false}}'])
    expect(readCachedAnswers(raw, questions)).toEqual({});
  for (const selectedOptions of [[2], [0, 0], [-1]])
    expect(readCachedAnswers(JSON.stringify({q: {selected: null, selectedOptions, reviewed: false}}), questions)).toEqual({});
  expect(readCachedAnswers(JSON.stringify({q: {selected: null, selectedOptions: [0, 1], reviewed: true}, removed: {}}), questions).q.selectedOptions).toEqual([0, 1]);
});
