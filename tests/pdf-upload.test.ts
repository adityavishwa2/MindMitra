import { describe, expect, it } from "vitest";
import { inferPdfDetails, pdfSource } from "../lib/pdf-upload";
import { importInput } from "../lib/validation";
describe("PDF-only intake", () => {
  const exams = [
    { id: "fallback", name: "Uploaded PYQ" },
    { id: "ssc", name: "SSC CGL", slug: "ssc-cgl" },
  ];
  it("matches a known exam/year without requesting metadata", () => {
    expect(
      inferPdfDetails(
        "SSC CGL 2025 Tier I",
        exams,
        "fallback",
        "paper.pdf",
        "a".repeat(64),
      ),
    ).toMatchObject({
      examId: "ssc",
      year: 2025,
      sourceUrl: pdfSource("a".repeat(64)),
    });
  });
  it("keeps unknown/ambiguous exams in the review collection", () => {
    expect(
      inferPdfDetails(
        "Unknown booklet",
        exams,
        "fallback",
        "booklet.pdf",
        "b".repeat(64),
      ),
    ).toMatchObject({
      examId: "fallback",
      notes: expect.arrayContaining([
        expect.stringContaining("not identified"),
      ]),
    });
    const ambiguous = [...exams, { id: "other", name: "SSC CGL" }];
    expect(
      inferPdfDetails("SSC CGL", ambiguous, "fallback", "x.pdf", "b".repeat(64))
        .examId,
    ).toBe("fallback");
  });
  it("binds a local uploaded-source identity to its checksum", () => {
    const d = inferPdfDetails(
      "2025",
      exams,
      "fallback",
      "paper.pdf",
      "c".repeat(64),
    );
    const payload = {
      ...d,
      marks: 1,
      penalty: 0,
      durationMinutes: 60,
      source: {
        title: d.title,
        url: d.sourceUrl,
        checksum: d.checksum,
        permission: "PENDING",
        permissionEvidence: d.permissionEvidence,
      },
      questions: [
        {
          number: 1,
          text: "Which option?",
          options: ["A", "B"],
          subject: "General",
          topic: "",
          language: "en",
          sourcePage: 1,
          keyStatus: "UNAVAILABLE",
          keyReference: "",
        },
      ],
    };
    expect(importInput.safeParse(payload).success).toBe(true);
    expect(
      importInput.safeParse({
        ...payload,
        source: { ...payload.source, checksum: "d".repeat(64) },
      }).success,
    ).toBe(false);
  });
});
