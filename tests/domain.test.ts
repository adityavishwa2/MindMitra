import { csvField } from "../lib/csv";
import { describe, it, expect } from "vitest";
import { scoreAnswers, paperComplete } from "../lib/scoring";
import { mergeLine, moveBoard, shuffledSliding } from "../lib/games";
import { questionInput, importInput } from "../lib/validation";
describe("historical scoring", () => {
  it("applies per-paper negative marks and excludes disputed/unavailable answers", () => {
    const rows = [
      {
        questionId: "a",
        answer: 0,
        keyStatus: "VERIFIED",
        selected: 0,
        subject: "Math",
      },
      {
        questionId: "b",
        answer: 0,
        keyStatus: "VERIFIED",
        selected: 1,
        subject: "Math",
      },
      {
        questionId: "c",
        answer: 0,
        keyStatus: "DISPUTED",
        selected: 0,
        subject: "Math",
      },
      {
        questionId: "d",
        answer: 1,
        keyStatus: "VERIFIED",
        selected: null,
        subject: "Math",
      },
    ];
    expect(scoreAnswers(rows, 2, 0.5)).toMatchObject({
      score: 1.5,
      correct: 1,
      incorrect: 1,
      unattempted: 1,
      unscored: 1,
      accuracy: 50,
    });
  });
  it("does not invent accuracy for unscorable work", () =>
    expect(scoreAnswers([], 1, 0).accuracy).toBeNull());
  it("requires all unique questions and nonempty inventory", () => {
    expect(paperComplete([], new Set())).toBe(false);
    expect(paperComplete(["a", "b"], new Set(["a"]))).toBe(false);
    expect(paperComplete(["a", "b"], new Set(["a", "b"]))).toBe(true);
  });
});
describe("game rules", () => {
  it("merges each tile at most once", () => {
    expect(mergeLine([2, 2, 2, 2])).toEqual({ line: [4, 4, 0, 0], score: 8 });
    expect(mergeLine([2, 2, 4, 0])).toEqual({ line: [4, 4, 0, 0], score: 4 });
  });
  it("supports vertical movement and detects unchanged board", () => {
    const b = [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(moveBoard(b, "up")).toMatchObject({ score: 4, changed: true });
    expect(moveBoard(Array(16).fill(0), "left").changed).toBe(false);
  });
  it("generates only solvable sliding boards", () => {
    for (let i = 0; i < 100; i++) {
      const b = shuffledSliding().filter(Boolean);
      const inversions = b.reduce(
        (n, x, i) => n + b.slice(i + 1).filter((y) => y < x).length,
        0,
      );
      expect(inversions % 2).toBe(0);
      expect(new Set(b).size).toBe(8);
    }
  });
});
it("rejects duplicate original numbers and invalid key indexes", () => {
  const question = {
    number: 1,
    text: "SYNTHETIC TEST ONLY",
    type: "MCQ",
    options: ["First", "Second"],
    subject: "Fixture",
    topic: "Fixture",
    language: "en",
    sourcePage: 1,
    answer: 0,
    keyStatus: "VERIFIED",
    keyReference: "Test fixture key",
  };
  expect(questionInput.safeParse({ ...question, answer: 2 }).success).toBe(
    false,
  );
  expect(
    questionInput.safeParse({ ...question, keyReference: "" }).success,
  ).toBe(false);
  expect(
    importInput.safeParse({
      examId: "test",
      year: 2024,
      stage: "TEST",
      shift: "TEST",
      title: "SYNTHETIC TEST ONLY",
      marks: 2,
      penalty: 0.5,
      durationMinutes: 10,
      source: {
        title: "Fixture",
        url: "https://example.com/test",
        checksum: "a".repeat(64),
        permission: "PENDING",
        permissionEvidence: "Test-only fixture",
      },
      questions: [question, question],
    }).success,
  ).toBe(false);
});

it("neutralizes spreadsheet formulas and quotes CSV", () => {
  expect(csvField("=SUM(A1:A2)")).toBe('"\'=SUM(A1:A2)"');
  expect(csvField('a,"b"')).toBe('"a,""b"""');
  expect(csvField(-1)).toBe('"-1"');
});
