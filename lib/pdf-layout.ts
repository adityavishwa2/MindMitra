import type { SourceRegion } from "./source-regions";

export type OcrLine = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
};
export type ScanColumn = {
  page: number;
  region: SourceRegion;
  width: number;
  height: number;
  lines: OcrLine[];
  markers?: number[];
};
export type ScanQuestion = {
  number: number;
  text: string;
  options: string[];
  sourcePage: number;
  sourceRegions: SourceRegion[];
  warnings: string[];
};

export function tsvLines(tsv: string): OcrLine[] {
  const lines = new Map<string, OcrLine>();
  for (const row of tsv.split(/\r?\n/).slice(1)) {
    const f = row.split("\t");
    if (f[0] !== "5" || !f[11]?.trim()) continue;
    const [left, top, width, height] = f.slice(6, 10).map(Number);
    if (![left, top, width, height].every(Number.isFinite)) continue;
    const key = f.slice(1, 5).join(":");
    const old = lines.get(key);
    if (old) {
      const right = Math.max(old.left + old.width, left + width);
      const bottom = Math.max(old.top + old.height, top + height);
      old.left = Math.min(old.left, left);
      old.top = Math.min(old.top, top);
      old.width = right - old.left;
      old.height = bottom - old.top;
      old.text += " " + f.slice(11).join("\t").trim();
    } else
      lines.set(key, {
        text: f.slice(11).join("\t").trim(),
        left,
        top,
        width,
        height,
      });
  }
  return [...lines.values()].sort((a, b) => a.top - b.top || a.left - b.left);
}

export function hasTwoColumns(lines: OcrLine[], width: number) {
  return (
    lines.filter(
      (l) => l.left < width * 0.45 && l.left + l.width < width * 0.57,
    ).length >= 8 &&
    lines.filter((l) => l.left > width * 0.45 && l.width > width * 0.12)
      .length >= 8
  );
}
function footer(text: string) {
  return /T[DO0]MN[- .]|\bP\.?T\.?O\.?\b|^\s*\(?\d{1,3}\s*[-–]\s*D\)?\s*$|SPACE FOR ROUGH WORK/i.test(
    text,
  );
}
function optionLabel(text: string) {
  const m = text.match(
    /^(?:[([{]|[fl])?\s*([a-dA-D])(?:[a-z@©]*)\s*[)\]}:.]\s*(.*)$/,
  );
  return m
    ? { index: m[1].toLowerCase().charCodeAt(0) - 97, text: m[2] }
    : null;
}
function median(values: number[]) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 40;
}

export function columnBodyLeft(lines: OcrLine[], width: number) {
  const alphabetic = lines.filter((l) => /^[A-Za-z]{2}/.test(l.text));
  const bins = new Map<number, number>();
  for (const l of alphabetic) {
    const bin = Math.round(l.left / 25) * 25;
    bins.set(bin, (bins.get(bin) || 0) + 1);
  }
  return (
    [...bins]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => a[0] - b[0])[0]?.[0] ?? width * 0.14
  );
}

/** Read each column top-to-bottom. Indented statement numbers are never question headings. */
export function questionsFromColumns(columns: ScanColumn[]): ScanQuestion[] {
  const result: ScanQuestion[] = [];
  let next = 1;
  for (const column of columns) {
    const lines = column.lines.filter(
      (l) => !footer(l.text) && l.top < column.height * 0.97,
    );
    if (!lines.length) continue;
    const bodyLeft = columnBodyLeft(lines, column.width);
    const margin = Math.max(
      column.width * 0.025,
      bodyLeft - column.width * 0.055,
    );
    const typicalGap = median(
      lines
        .slice(1)
        .map((l, i) => l.top - lines[i].top)
        .filter((v) => v > 20 && v < column.height * 0.08),
    );
    const starts: { index: number; number?: number; boundary: number }[] = [
      { index: 0, boundary: 0 },
    ];
    let sawOption = false,
      lastOption = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i],
        label = optionLabel(line.text);
      const m = line.text.match(/^\W*(\d{1,3})[.)}:]?\s+\S/);
      const headingCue =
        /^.{0,18}\b(?:Which|What|Consider|With|Among|In|The|A|An|How|Who|From|When|Match)\b/.test(
          line.text,
        );
      const marker =
        line.left <= margin &&
        (m || headingCue) &&
        !/^\s*(?:Select|Use)\b/i.test(line.text);
      const previous = lines[i - 1];
      const afterOptions =
        previous &&
        sawOption &&
        lastOption === 3 &&
        !label &&
        line.top - previous.top > typicalGap * 1.12 &&
        line.left <= bodyLeft + column.width * 0.055 &&
        !/^[\W\d]*[a-d][)\]}]/i.test(line.text);
      if (i > 0 && (marker || afterOptions)) {
        const boundary = marker
          ? Math.max(0, line.top - typicalGap * 0.45)
          : Math.max(
              previous.top + previous.height + 5,
              line.top - typicalGap * 1.2,
            );
        // Avoid splitting annotations/duplicate OCR rows from their heading.
        if (boundary - starts[starts.length - 1].boundary > typicalGap * 2) {
          starts.push({
            index: i,
            number: marker && m ? Number(m[1]) : undefined,
            boundary,
          });
          sawOption = false;
          lastOption = -1;
        }
      }
      if (label) {
        sawOption = true;
        lastOption = Math.max(lastOption, label.index);
      }
    }
    if (column.markers?.length) {
      const inkStarts = [{ index: 0, boundary: 0 }];
      for (const top of column.markers) {
        if (top < column.height * 0.15 || top > column.height * 0.89) continue;
        const row = lines.findIndex(
          (line) => line.top >= top - typicalGap * 0.45,
        );
        if (row <= 0 || optionLabel(lines[row].text)) continue;
        const boundary = Math.max(0, top - typicalGap * 0.4);
        if (
          boundary - inkStarts[inkStarts.length - 1].boundary >
          typicalGap * 2.5
        )
          inkStarts.push({ index: row, boundary });
      }
      // Gutter ink survives circled/misread digits and OCR-dropped heading lines.
      starts.splice(0, starts.length, ...inkStarts);
    }
    const first =
      lines[0].left <= margin
        ? lines[0].text.match(/^\W*(\d{1,3})[.)}:]?\s/)
        : null;
    if (first) starts[0].number = Number(first[1]);
    for (let s = 0; s < starts.length; s++) {
      const start = starts[s],
        end = starts[s + 1];
      const block = lines.slice(start.index, end?.index ?? lines.length);
      const joined = block.map((l) => l.text).join("\n");
      // Skip instructions/blank backs: question cards must contain choice evidence.
      if (
        (!column.markers?.length && !block.some((l) => optionLabel(l.text))) ||
        !/[a-z]{3}/i.test(joined)
      )
        continue;
      let number = start.number;
      const warnings: string[] = [];
      if (!number || number !== next) {
        number = next;
        warnings.push(
          `Question ${number}: printed number was inferred from reading order; check the scan.`,
        );
      } else if (number !== next)
        warnings.push(
          `Questions ${next}–${number - 1} may be missing before this scan region.`,
        );
      next = number + 1;
      const options = ["", "", "", ""];
      const body: string[] = [];
      let active = -1;
      for (let i = 0; i < block.length; i++) {
        let text = block[i].text;
        if (i === 0)
          text = text
            .replace(/^\W*\d{1,3}[.)}:]?\s+/, "")
            .replace(/^[()©®@?]+\s*/, "");
        const label = optionLabel(text);
        if (label && label.index > active) {
          active = label.index;
          options[active] = label.text;
        } else if (active >= 0)
          options[active] += (options[active] ? "\n" : "") + text;
        else body.push(text);
      }
      if (options.some((value) => !value.trim()))
        warnings.push(
          `Question ${number}: one or more option labels were unreadable; use the source image for A–D.`,
        );
      const bottom =
        end?.boundary ??
        Math.min(
          column.height,
          block[block.length - 1].top +
            block[block.length - 1].height +
            typicalGap * 1.7,
        );
      const region: SourceRegion = {
        ...column.region,
        y:
          column.region.y +
          (start.boundary / column.height) * column.region.height,
        height:
          ((bottom - start.boundary) / column.height) * column.region.height,
      };
      result.push({
        number,
        text: (body.join("\n") || `Scanned question ${number}`).slice(0, 20000),
        options: options.map(
          (value, i) =>
            value.trim().slice(0, 4000) ||
            `Option ${String.fromCharCode(65 + i)} — see source image`,
        ),
        sourcePage: column.page,
        sourceRegions: [region],
        warnings,
      });
    }
  }
  return result;
}
