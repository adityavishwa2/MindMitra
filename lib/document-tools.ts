import { existsSync } from "node:fs";
import { join, win32 } from "node:path";

export type DocumentTool = "tesseract" | "pdfinfo" | "pdftotext" | "pdftoppm";
/** Resolve at invocation time: Windows terminals can retain PATH from before installation. */
export function resolveDocumentTool(
  tool: DocumentTool,
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
  exists: (path: string) => boolean = existsSync,
) {
  const explicit = env[`${tool.toUpperCase()}_PATH`]?.trim();
  if (explicit) return explicit.replace(/^"|"$/g, "");
  const path = platform === "win32" ? win32 : { join };
  const executable = `${tool}${platform === "win32" ? ".exe" : ""}`;
  const candidates = [
    path.join(
      process.cwd(),
      "tools",
      tool === "tesseract" ? "tesseract" : "poppler",
      "bin",
      executable,
    ),
  ];
  if (tool !== "tesseract" && env.POPPLER_PATH)
    candidates.unshift(path.join(env.POPPLER_PATH, executable));
  if (platform === "win32") {
    const programFiles = env.ProgramFiles || "C:\\Program Files";
    const programFiles86 =
      env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    if (tool === "tesseract") {
      for (const root of [
        programFiles,
        programFiles86,
        env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs"),
      ])
        if (root) candidates.push(path.join(root, "Tesseract-OCR", executable));
    } else {
      for (const root of [programFiles, "C:\\"])
        for (const directory of ["poppler\\Library\\bin", "poppler\\bin"])
          candidates.push(path.join(root, directory, executable));
    }
    if (env.LOCALAPPDATA)
      candidates.push(
        path.join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Links", executable),
      );
    if (env.USERPROFILE)
      candidates.push(
        path.join(
          env.USERPROFILE,
          "scoop",
          "apps",
          tool === "tesseract" ? "tesseract" : "poppler",
          "current",
          tool === "tesseract" ? "" : "bin",
          executable,
        ),
      );
    if (env.ChocolateyInstall)
      candidates.push(path.join(env.ChocolateyInstall, "bin", executable));
  }
  return candidates.find(exists) ?? tool;
}
