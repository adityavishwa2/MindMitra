import { describe, it, expect } from "vitest";
import { resolveDocumentTool } from "../lib/document-tools";
describe("PDF tools on Windows with stale PATH", () => {
  it("finds the installed Tesseract without a PATH entry", () => {
    const installed = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
    expect(
      resolveDocumentTool("tesseract", {}, "win32", (p) => p === installed),
    ).toBe(installed);
  });
  it("supports a custom Program Files location", () => {
    const installed = "D:\\Apps\\Tesseract-OCR\\tesseract.exe";
    expect(
      resolveDocumentTool(
        "tesseract",
        { ProgramFiles: "D:\\Apps" },
        "win32",
        (p) => p === installed,
      ),
    ).toBe(installed);
  });
  it("honours an explicit executable rather than silently choosing another installation", () => {
    expect(
      resolveDocumentTool(
        "tesseract",
        { TESSERACT_PATH: '"D:\\OCR Tools\\tesseract.exe"' },
        "win32",
        () => true,
      ),
    ).toBe("D:\\OCR Tools\\tesseract.exe");
  });
  it("supports a shared Poppler executable directory", () => {
    expect(
      resolveDocumentTool(
        "pdftoppm",
        { POPPLER_PATH: "D:\\Poppler\\bin" },
        "win32",
        (p) => p === "D:\\Poppler\\bin\\pdftoppm.exe",
      ),
    ).toBe("D:\\Poppler\\bin\\pdftoppm.exe");
  });
  it("retains ordinary command discovery on Linux", () => {
    expect(resolveDocumentTool("tesseract", {}, "linux", () => false)).toBe(
      "tesseract",
    );
  });
});
