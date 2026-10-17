/** Quote CSV fields and neutralize spreadsheet formulas in user-controlled strings. */
export function csvField(value: string | number | null) {
  if (value === null) return '""';
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCsv(rows: (string | number | null)[][]) {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}
