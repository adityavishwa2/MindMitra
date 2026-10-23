export const MAX_PDF_BYTES = 20_000_000;
export const MAX_JSON_BYTES = 2_000_000;
export function paperFileLimit(name: string) {
  return name.toLowerCase().endsWith(".pdf") ? MAX_PDF_BYTES : MAX_JSON_BYTES;
}
