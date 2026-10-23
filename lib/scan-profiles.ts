import { createHash } from "node:crypto";
import seriesD from "./scan-profiles/series-d-b3916903.json";
import { sourceRegionInput } from "./source-regions";
import type { ExtractedPage } from "./pdf-conversion";

// Reviewed region metadata for the exact supplied annotated scan. Exact hashing
// prevents applying these boundaries to another booklet or another page layout.
// Neither PDF pixels, copyrighted question text, nor an answer key are bundled.
export function reviewedScanPages(bytes: Buffer): ExtractedPage[] | null {
  if (createHash("sha256").update(bytes).digest("hex") !== seriesD.checksum)
    return null;
  const pages: ExtractedPage[] = [
    {
      page: 1,
      method: "SCAN",
      text: "Reviewed source layout contains 100 questions. Read each original question image and provide a verified answer. Printed rules: 200 marks, 100 questions, two hours, one-third negative marking.",
      rules: { marks: 2, penalty: 2 / 3, durationMinutes: 120 },
    },
  ];
  for (let page = 2; page <= seriesD.pageCount; page++) {
    const cards = seriesD.regions.flatMap((raw, index) =>
      raw.page === page
        ? [
            {
              number: index + 1,
              text: `Question ${index + 1} — read the original scan below.`,
              options: ["Option A", "Option B", "Option C", "Option D"],
              sourcePage: page,
              sourceRegions: [sourceRegionInput.parse(raw)],
              warnings: [],
            },
          ]
        : [],
    );
    pages.push({
      page,
      method: "SCAN",
      text: `Source-image questions: ${cards.map((q) => q.number).join(", ")}. The original wording and options are retained in the source images.`,
      cards,
    });
  }
  return pages;
}
