import { deflateSync } from "node:zlib";
export function pdfDocument(objects: Array<string | Buffer>) {
  let document = Buffer.from("%PDF-1.4\n");
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(document.length);
    document = Buffer.concat([
      document,
      Buffer.from(`${i + 1} 0 obj\n`),
      Buffer.from(object),
      Buffer.from("\nendobj\n"),
    ]);
  });
  const xref = document.length;
  document = Buffer.concat([
    document,
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
        .join(
          "",
        )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
    ),
  ]);
  return document;
}
export function textPdf(
  lines = [
    "1. Which number is even?",
    "(A) Three",
    "(B) Four",
    "2. Choose the first letter.",
    "(A) Alpha",
    "(B) Beta",
  ],
  paddingBytes = 0,
) {
  const content = `BT /F1 18 Tf 50 750 Td ${lines.map((line, i) => `${i ? "0 -32 Td " : ""}(${line.replace(/[\\()]/g, "\\$&")}) Tj`).join("\n")} ET` + " ".repeat(paddingBytes);
  return pdfDocument([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ]);
}
export function scannedPdf(ppm: Buffer) {
  const header = ppm
    .toString("ascii", 0, 100)
    .match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
  if (!header) throw Error("Expected PPM image");
  const compressed = deflateSync(ppm.subarray(header[0].length));
  const content = "q 612 0 0 792 0 0 cm /Image Do Q";
  return pdfDocument([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Image 4 0 R >> >> /Contents 5 0 R >>",
    Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${header[1]} /Height ${header[2]} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`,
      ),
      compressed,
      Buffer.from("\nendstream"),
    ]),
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]);
}
