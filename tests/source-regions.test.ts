import { expect, it } from "vitest";
import { sourceRegionsInput } from "../lib/source-regions";
import { questionsFromColumns } from "../lib/pdf-layout";
import { findColumnDivider } from "../lib/pdf-scan";
import profile from "../lib/scan-profiles/series-d-b3916903.json";
it("validates normalized crop bounds, page counts and rotation", () => {
  expect(
    sourceRegionsInput.parse([
      { page: 2, x: 0, y: 0, width: 0.5, height: 0.8 },
    ])[0].rotation,
  ).toBe(0);
  for (const patch of [
    { x: -1 },
    { page: 81 },
    { rotation: 6 },
    { width: 1.2 },
    { y: 0.8, height: 0.5 },
  ])
    expect(
      sourceRegionsInput.safeParse([
        { page: 2, x: 0, y: 0, width: 0.5, height: 0.8, ...patch },
      ]).success,
    ).toBe(false);
});
it("detects a slanted printed divider without interpreting question text", () => {
  const w = 600,
    h = 850,
    data = new Uint8Array(w * h).fill(240);
  for (let y = 0; y < h; y++) {
    const x = Math.round(285 + 12 * (y / h - 0.5));
    for (let d = -2; d <= 2; d++) data[y * w + x + d] = 45;
  }
  const found = findColumnDivider(data, w, h);
  expect(found?.confidence).toBeGreaterThan(0.8);
  expect(found?.x).toBeGreaterThan(275);
  expect(found?.x).toBeLessThan(295);
  expect(findColumnDivider(new Uint8Array(w * h).fill(240), w, h)).toBeNull();
});
it("does not turn indented statement numbers into separate questions", () => {
  const lines = [
    { left: 10, top: 10, text: "1. Consider these statements" },
    { left: 130, top: 70, text: "1. First statement" },
    { left: 130, top: 130, text: "2. Second statement" },
    { left: 130, top: 190, text: "(a) First" },
    { left: 130, top: 250, text: "(b) Second" },
    { left: 130, top: 310, text: "(c) Third" },
    { left: 130, top: 370, text: "(d) Fourth" },
    { left: 10, top: 500, text: "2. Which option?" },
    { left: 130, top: 560, text: "(a) One" },
    { left: 130, top: 620, text: "(b) Two" },
  ].map((l) => ({ ...l, width: 500, height: 30 }));
  const q = questionsFromColumns([
    {
      page: 2,
      region: { page: 2, x: 0, y: 0, width: 0.5, height: 0.9, rotation: 0 },
      width: 900,
      height: 1000,
      lines,
    },
  ]);
  expect(q).toHaveLength(2);
  expect(q[0].text).toContain("2. Second statement");
  expect(q[0].sourceRegions[0].height).toBeLessThan(0.5);
});
it("keeps exactly 100 reviewed source regions for the exact supplied scan", () => {
  expect(profile.regions).toHaveLength(100);
  for (const region of profile.regions)
    expect(sourceRegionsInput.safeParse([region]).success).toBe(true);
  expect(profile.regions[0].page).toBe(2);
  expect(profile.regions[99].page).toBe(26);
});

it("renders a real bounded PDF source crop as a JPEG", async () => {
  const { sourceQuestionImage } = await import("../lib/source-image");
  const { textPdf } = await import("./helpers/pdf");
  const sharp = (await import("sharp")).default;
  const { createHash } = await import("node:crypto");
  const pdf = textPdf();
  const image = await sourceQuestionImage(
    pdf,
    createHash("sha256").update(pdf).digest("hex"),
    [{ page: 1, x: 0, y: 0, width: 1, height: 0.4 }],
  );
  const meta = await sharp(image).metadata();
  expect(meta.format).toBe("jpeg");
  expect(meta.width).toBeGreaterThan(500);
  expect(meta.height).toBeGreaterThan(100);
  await expect(
    sourceQuestionImage(pdf, "invalid", [
      { page: 1, x: 0, y: 0, width: 2, height: 1 },
    ]),
  ).rejects.toThrow();
}, 15000);
