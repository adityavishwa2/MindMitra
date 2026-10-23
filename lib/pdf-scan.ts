import sharp from "sharp";
import type { ScanColumn } from "./pdf-layout";
import { tsvLines, columnBodyLeft } from "./pdf-layout";

/** Find the printed divider, including a small photographic skew, rather than assuming page centre. */
export function findColumnDivider(
  data: Uint8Array,
  width: number,
  height: number,
) {
  let best = { score: 0, x: width / 2, delta: 0 };
  const stepX = Math.max(3, Math.round(width / 420)),
    stepD = Math.max(6, Math.round(width / 220));
  const stepY = Math.max(8, Math.round(height / 250));
  for (let x = Math.floor(width * 0.37); x < width * 0.63; x += stepX) {
    for (
      let delta = -Math.round(width * 0.07);
      delta <= width * 0.07;
      delta += stepD
    ) {
      let score = 0,
        count = 0;
      for (let y = Math.round(height * 0.08); y < height * 0.88; y += stepY) {
        const xx = Math.round(x + delta * (y / height - 0.5));
        let value = 255;
        for (let d = -3; d <= 3; d++)
          value = Math.min(value, data[y * width + xx + d]);
        const bg = (data[y * width + xx - 18] + data[y * width + xx + 18]) / 2;
        if (value < 180 && value + 15 < bg) score++;
        count++;
      }
      if (score / count > best.score) best = { score: score / count, x, delta };
    }
  }
  return best.score >= 0.65
    ? {
        x: best.x,
        rotation: (Math.atan(best.delta / height) * 180) / Math.PI,
        confidence: best.score,
      }
    : null;
}

type Ocr = (file: string, mode: string) => Promise<string>;
export async function readScanColumns(
  file: string,
  page: number,
  tempPrefix: string,
  ocr: Ocr,
): Promise<ScanColumn[] | null> {
  const { data, info } = await sharp(file)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const divider = findColumnDivider(data, info.width, info.height);
  if (!divider) return null;
  const rotation = divider.rotation;
  const corrected = await sharp(file)
    .rotate(rotation, { background: "white" })
    .grayscale()
    .normalize()
    .png()
    .toBuffer();
  const meta = await sharp(corrected).metadata();
  const w = meta.width!,
    h = meta.height!;
  const split = Math.round(
    w / 2 + (divider.x - info.width / 2) * Math.cos((rotation * Math.PI) / 180),
  );
  const top = Math.round(h * 0.04),
    bottom = Math.round(h * 0.9);
  const columns: ScanColumn[] = [];
  for (let column = 0; column < 2; column++) {
    const left = column ? split + 8 : 0;
    const right = column ? Math.round(w * 0.975) : split - 8;
    const image = `${tempPrefix}-${column}.png`;
    await sharp(corrected)
      .extract({ left, top, width: right - left, height: bottom - top })
      .png()
      .toFile(image);
    const tsv = await ocr(image, "6");
    const lines = tsvLines(tsv);
    const raw = await sharp(image).grayscale().raw().toBuffer();
    const bandWidth = Math.max(
      Math.round((right - left) * 0.07),
      Math.min(
        Math.round((right - left) * 0.18),
        Math.round(columnBodyLeft(lines, right - left) - 35),
      ),
    );
    const markers = numberGutterMarkers(
      raw,
      right - left,
      bottom - top,
      bandWidth,
    );
    columns.push({
      page,
      markers,
      region: {
        page,
        x: left / w,
        y: top / h,
        width: (right - left) / w,
        height: (bottom - top) / h,
        rotation,
      },
      width: right - left,
      height: bottom - top,
      lines,
    });
  }
  return columns;
}

/** Locate isolated question-number ink in the outer number gutter, not indented statement lists. */
export function numberGutterMarkers(
  data: Uint8Array,
  width: number,
  height: number,
  bandWidth: number,
) {
  const rows: number[] = [];
  const ignored = new Set<number>();
  for (let x = 0; x < bandWidth; x++) {
    let dark = 0,
      total = 0;
    for (let y = 0; y < height; y += 12) {
      if (data[y * width + x] < 170) dark++;
      total++;
    }
    if (dark > total * 0.35) ignored.add(x);
  }
  const activeWidth = bandWidth - ignored.size;
  const hist = new Uint32Array(256);
  for (let y = 0; y < height * 0.97; y++) {
    hist.fill(0);
    for (let x = 0; x < bandWidth; x++)
      if (!ignored.has(x)) hist[data[y * width + x]]++;
    let sum = 0,
      background = 255;
    for (let v = 0; v < 256; v++) {
      sum += hist[v];
      if (sum >= activeWidth * 0.9) {
        background = v;
        break;
      }
    }
    const threshold = Math.min(185, background - 35);
    let ink = 0;
    for (let v = 0; v < threshold; v++) ink += hist[v];
    if (ink >= Math.max(7, width * 0.008) && ink < activeWidth * 0.7)
      rows.push(y);
  }
  const groups: number[][] = [];
  for (const y of rows) {
    const last = groups[groups.length - 1];
    if (last && y - last[last.length - 1] <= Math.max(12, height * 0.007))
      last.push(y);
    else groups.push([y]);
  }
  return groups
    .filter(
      (g) =>
        g[g.length - 1] - g[0] >= height * 0.004 &&
        g[g.length - 1] - g[0] < height * 0.075,
    )
    .map((g) => g[0]);
}
