export const PDF_SOURCE = /^urn:sha256:[a-f0-9]{64}$/;
export const UPLOADED_PYQ_SLUG = "uploaded-pyq";
export function pdfSource(checksum: string) {
  return `urn:sha256:${checksum}`;
}
export function inferPdfDetails(
  text: string,
  exams: { id: string; name: string; slug?: string }[],
  fallbackId: string,
  filename: string,
  checksum: string,
) {
  const normalized = ` ${text
    .slice(0, 12000)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")} `;
  const candidates = exams
    .filter((e) => e.id !== fallbackId)
    .map((e) => {
      const names = [e.name, e.slug ?? ""]
        .map((s) =>
          s
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim(),
        )
        .filter((s) => s.length >= 4);
      return {
        id: e.id,
        score: Math.max(
          0,
          ...names
            .filter((s) => normalized.includes(` ${s} `))
            .map((s) => s.length),
        ),
      };
    })
    .filter((e) => e.score)
    .sort((a, b) => b.score - a.score);
  const matched =
    candidates[0] &&
    (!candidates[1] || candidates[0].score > candidates[1].score);
  const year = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)]
    .map((m) => Number(m[0]))
    .find((y) => y <= new Date().getFullYear());
  return {
    examId: matched ? candidates[0].id : fallbackId,
    year: year ?? new Date().getFullYear(),
    stage: "PYQ",
    shift: `PDF-${checksum.slice(0, 16)}`,
    title:
      filename
        .replace(/\.pdf$/i, "")
        .replace(/[_]+/g, " ")
        .trim()
        .slice(0, 200) || "Uploaded question paper",
    sourceUrl: pdfSource(checksum),
    permissionEvidence:
      "Uploaded PDF. Reuse permission has not yet been reviewed.",
    checksum,
    notes: [
      matched
        ? "Exam matched from the file name or PDF text; check it before approval."
        : "Exam not identified. This draft is in Uploaded PYQ; its exam can be changed during review.",
      ...(year
        ? []
        : [
            "No paper year identified. The current year is a placeholder; check it during review.",
          ]),
    ],
  };
}
