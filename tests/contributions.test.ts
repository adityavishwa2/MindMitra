import { describe, it, expect } from "vitest";
import {
  contributionInput,
  assertPaperMatches,
  contributionPoints,
} from "../lib/contributions";
describe("contribution validation", () => {
  const metadata = {
    examId: "exam",
    year: 2025,
    stage: "Tier I",
    shift: "Morning",
    title: "Previous year paper",
    sourceUrl: "https://example.org/paper.pdf",
    permissionEvidence: "Permission documented by the publisher",
    rightsConfirmed: "yes",
    publicAlias: "Exam helper",
  };
  it("requires explicit reuse confirmation and HTTPS provenance", () => {
    expect(contributionInput.safeParse(metadata).success).toBe(true);
    expect(
      contributionInput.safeParse({ ...metadata, rightsConfirmed: "no" })
        .success,
    ).toBe(false);
    expect(
      contributionInput.safeParse({
        ...metadata,
        sourceUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      contributionInput.safeParse({
        ...metadata,
        sourceUrl: "http://example.org/paper",
      }).success,
    ).toBe(false);
  });
  it("allows private participation and disallows malformed public aliases", () => {
    expect(
      contributionInput.parse({ ...metadata, publicAlias: "" }).publicAlias,
    ).toBe("");
    expect(
      contributionInput.safeParse({ ...metadata, publicAlias: "<script>" })
        .success,
    ).toBe(false);
  });
  it("prevents approval for a different exam, year, stage or shift", () => {
    expect(() => assertPaperMatches(metadata, metadata)).not.toThrow();
    for (const [key, value] of [
      ["examId", "other"],
      ["year", 2024],
      ["stage", "Tier II"],
      ["shift", "Evening"],
    ] as const)
      expect(() =>
        assertPaperMatches(metadata, { ...metadata, [key]: value }),
      ).toThrow("must match");
  });
  it("awards paper credits without rewarding upload attempts", () => {
    expect(contributionPoints(0)).toBe(0);
    expect(contributionPoints(3)).toBe(30);
  });
});
