import { expect, it } from "vitest";
import { needsCbtText, parseQuestionOcr } from "../lib/cbt";
it("requires real CBT content rather than scan placeholders", () => {
  expect(
    needsCbtText({
      text: "Question 1 — read the original scan below.",
      options: ["Option A", "Option B"],
      sourceRegions: [{}],
    }),
  ).toBe(true);
  expect(
    needsCbtText({
      text: "Which number is even?",
      options: ["Three", "Four"],
      sourceRegions: [{}],
    }),
  ).toBe(false);
});
it("splits OCR into a stem and options, including inline options", () => {
  expect(
    parseQuestionOcr("12. Which number is even?\n(a) Three\n(b) Four", 12),
  ).toEqual({ text: "Which number is even?", options: ["Three", "Four"] });
  expect(
    parseQuestionOcr("1. Choose one\n(a) First (b) Second", 1)?.options,
  ).toEqual(["First", "Second"]);
  expect(parseQuestionOcr("Unreliable text without options", 1)).toBeNull();
});

it("recovers marked option labels without treating handwriting as an answer", () => {
  expect(
    parseQuestionOcr(
      "Which is correct?\nSelect the answer using the code given below :\n() First\nw®) Second\n@) Third\n(d) Fourth",
      1,
    )?.options,
  ).toEqual(["First", "Second", "Third", "Fourth"]);
});

it("does not turn a stray footer into a missing option", () => {
  expect(
    parseQuestionOcr(
      "Choose a code\nSelect the answer using the code given below :\nG&) 1,2and3\n(ec) 1,3and4\n4 2 and 4 only\nws",
      6,
    ),
  ).toBeNull();
});
