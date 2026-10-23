export function needsCbtText(q: {
  text: string;
  options: string[];
  sourceRegions?: unknown[];
}) {
  return (
    !!q.sourceRegions?.length &&
    (/^(?:question|source question)\s*\d*(?:\s*$|\s*[—:-].*original scan)/i.test(
      q.text.trim(),
    ) ||
      q.options.some((o) => /^option\s*[a-h]$/i.test(o.trim())))
  );
}
export function parseQuestionOcr(text: string, number: number) {
  const clean = text.replace(/\r/g, "").trim();
  const lines = clean.split("\n");
  let split = -1;
  for (let i = 0; i < lines.length; i++)
    if (/code given below|answer using.*below/i.test(lines[i])) split = i;
  if (split >= 0) {
    const marker =
      /^\s*[‘'“"|]*\s*(?:[（(\[]?\s*(?:[a-z]{1,3}[>]?)\s*[)）\].:—-]|[（(]?[fw]?[@©®][)>）]?|\(\s*\))\s*[—-]?\s*/i;
    const parts: string[] = [];
    for (const line of lines.slice(split + 1)) {
      const match = line.match(marker);
      if (match) parts.push(line.slice(match[0].length).trim());
      else if (parts.length && line.trim())
        parts[parts.length - 1] += " " + line.trim();
    }
    if (parts.length !== 4) {
      const tail = lines
        .slice(split + 1)
        .map((l) => l.trim())
        .filter(Boolean);
      if (tail.length === 4 && tail.every((line) => /[0-9Il]/.test(line)))
        return {
          text: lines
            .slice(0, split + 1)
            .join("\n")
            .trim(),
          options: tail.map((l) => l.replace(marker, "").trim()),
        };
    }
    if (parts.length === 4 && parts.every(Boolean))
      return {
        text: lines
          .slice(0, split + 1)
          .join("\n")
          .replace(new RegExp(`^\\s*${number}[.)]?\\s*`), "")
          .trim(),
        options: parts,
      };
  }
  const matches = [
    ...clean.matchAll(
      /(?:^|\n|[ \t]+(?=[（(\[]))\s*[‘'“"|]*[（(\[]?([fwe]?[a-hA-H][a-z>]?|[@©®])[)）\].:]\s*/g,
    ),
  ];
  if (matches.length < 2) return null;
  const options = matches.map((m, i) =>
    clean
      .slice(m.index! + m[0].length, matches[i + 1]?.index ?? clean.length)
      .trim(),
  );
  const stem = clean
    .slice(0, matches[0].index)
    .replace(new RegExp(`^\\s*${number}[.)]?\\s*`), "")
    .trim();
  if (!stem || options.some((o) => !o)) return null;
  return { text: stem, options: options.slice(0, 8) };
}
