import { describe, expect, it } from "vitest";
import { gradeAnswer, scoreAnswers } from "../lib/scoring";
import { questionInput } from "../lib/validation";
import { draftFromPages } from "../lib/pdf-conversion";
const q = {
  number: 1,
  text: "Select all prime numbers",
  type: "MSQ",
  options: ["2", "4", "3"],
  subject: "Mathematics",
  topic: "Primes",
  language: "en",
  sourcePage: 1,
  answer: null,
  correctAnswers: [0, 2],
  keyStatus: "VERIFIED",
  keyReference: "Synthetic answer-key reference",
};
const row = {
  questionId: "q",
  type: "MSQ",
  answer: null,
  correctAnswers: [0, 2],
  keyStatus: "VERIFIED",
  selected: null,
  selectedOptions: [2, 0],
  subject: "Math",
};
const meta = {
  examId: "test",
  year: 2025,
  stage: "Test",
  shift: "Test",
  title: "Synthetic MCQ/MSQ",
  sourceUrl: "https://example.org/test.pdf",
  checksum: "a".repeat(64),
  permissionEvidence: "Synthetic fixture owned by author",
};
describe("multiple-select questions", () => {
  it("requires nonempty distinct valid key choices for verified MSQs", () => {
    expect(questionInput.safeParse(q).success).toBe(true);
    expect(questionInput.safeParse({ ...q, keyReference: "" }).success).toBe(
      true,
    );
    for (const change of [
      { correctAnswers: [] },
      { correctAnswers: [0, 0] },
      { correctAnswers: [0, 3] },
      { answer: 0 },
    ])
      expect(questionInput.safeParse({ ...q, ...change }).success).toBe(false);
    expect(
      questionInput.safeParse({
        ...q,
        correctAnswers: [],
        keyStatus: "UNAVAILABLE",
      }).success,
    ).toBe(true);
    expect(
      questionInput.safeParse({ ...q, type: "MCQ", answer: 0 }).success,
    ).toBe(false);
  });
  it("scores exact sets independently of order without partial credit", () => {
    expect(gradeAnswer(row)).toBe("CORRECT");
    for (const options of [[0], [2], [0, 1, 2], [1], [0, 0]])
      expect(gradeAnswer({ ...row, selectedOptions: options })).toBe(
        "INCORRECT",
      );
    expect(gradeAnswer({ ...row, selectedOptions: [] })).toBe("UNATTEMPTED");
    expect(gradeAnswer({ ...row, keyStatus: "UNAVAILABLE" })).toBe("UNSCORED");
    expect(gradeAnswer({ ...row, keyStatus: "DISPUTED" })).toBe("UNSCORED");
  });
  it("allows a multiple-select question to have only one correct option", () => {
    expect(questionInput.safeParse({ ...q, correctAnswers: [0] }).success).toBe(
      true,
    );
    expect(
      gradeAnswer({ ...row, correctAnswers: [0], selectedOptions: [0] }),
    ).toBe("CORRECT");
  });
  it("combines MCQ and MSQ scoring with the paper's marking rules", () => {
    expect(
      scoreAnswers(
        [
          row,
          { ...row, selectedOptions: [0] },
          { ...row, selectedOptions: [] },
          { ...row, keyStatus: "UNAVAILABLE" },
          {
            ...row,
            type: "MCQ",
            answer: 1,
            selected: 1,
            correctAnswers: [],
            selectedOptions: [],
          },
        ],
        2,
        0.5,
      ),
    ).toMatchObject({
      correct: 2,
      incorrect: 1,
      unattempted: 1,
      unscored: 1,
      score: 3.5,
      accuracy: 67,
    });
  });
  it("automatically identifies explicit MSQ instructions while leaving keys unverified", () => {
    const result = draftFromPages(
      [
        {
          page: 2,
          method: "TEXT",
          text: "1. Select all that apply: prime numbers\n(A) 2\n(B) 4\n(C) 3\n2. Choose one answer: the even number\n(A) 2\n(B) 3",
        },
      ],
      meta,
    );
    expect(result.payload?.questions.map((q) => q.type)).toEqual([
      "MSQ",
      "MCQ",
    ]);
    expect(result.payload?.questions[0]).toMatchObject({
      answer: null,
      correctAnswers: [],
      keyStatus: "UNAVAILABLE",
      sourcePage: 2,
    });
  });
  it("recognizes labeled MSQ sections and later MCQ sections", () => {
    const result = draftFromPages(
      [
        {
          page: 1,
          method: "TEXT",
          text: "Section B: Multiple Select Questions\n1. Identify the primes\n(A) 2\n(B) 4\n(C) 3\nMCQ Questions\n2. Choose a number\n(A) One\n(B) Two",
        },
      ],
      meta,
    );
    expect(result.payload?.questions.map((q) => q.type)).toEqual([
      "MSQ",
      "MCQ",
    ]);
  });
  it("recognizes explicit Hindi multiple-selection instructions", () => {
    const result = draftFromPages(
      [
        {
          page: 1,
          method: "TEXT",
          text: "1. सभी सही विकल्प चुनें\n(A) पहला\n(B) दूसरा\n(C) तीसरा",
        },
      ],
      meta,
    );
    expect(result.payload?.questions[0]).toMatchObject({
      type: "MSQ",
      language: "hi",
    });
  });
});
