import { readFile, writeFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { importInput } from "../../lib/validation";
const [metadata, csv, output] = process.argv.slice(2);
if (!metadata || !csv || !output)
  throw new Error(
    "Usage: npm run import:csv -- paper-metadata.json questions.csv output.json",
  );
async function main() {
  const meta = JSON.parse(await readFile(metadata, "utf8"));
  const raw = await readFile(csv);
  if (raw.length > 2_000_000) throw new Error("CSV exceeds 2 MB");
  const rows: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });
  const payload = importInput.parse({
    ...meta,
    questions: rows.map((r) => ({
      number: Number(r.number),
      text: r.text,
      type: r.type || "MCQ",
      options: JSON.parse(r.options),
      subject: r.subject,
      topic: r.topic,
      language: r.language || "en",
      sourcePage: Number(r.sourcePage),
      answer: !r.answer ? null : Number(r.answer),
      correctAnswers: r.correctAnswers ? JSON.parse(r.correctAnswers) : [],
      keyStatus: r.keyStatus,
      keyReference: r.keyReference,
      explanation: r.explanation || undefined,
    })),
  });
  await writeFile(output, JSON.stringify(payload, null, 2), { flag: "wx" });
  console.log(
    "Validated JSON created for the administrator import screen. Not published.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
