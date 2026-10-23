import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
export type MediaTool = "ffmpeg" | "ffprobe";
export function windowsMediaCandidates(
  tool: MediaTool,
  env: Record<string, string | undefined> = process.env,
) {
  const exe = `${tool}.exe`;
  const candidates: string[] = [];
  if (env.LOCALAPPDATA)
    candidates.push(
      join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Links", exe),
    );
  if (env.USERPROFILE)
    candidates.push(
      join(env.USERPROFILE, "scoop", "apps", "ffmpeg", "current", "bin", exe),
    );
  if (env.ProgramFiles)
    candidates.push(join(env.ProgramFiles, "ffmpeg", "bin", exe));
  const roots = [
    env.LOCALAPPDATA &&
      join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages"),
    env.ProgramFiles && join(env.ProgramFiles, "WinGet", "Packages"),
  ].filter((p): p is string => !!p);
  for (const root of roots) {
    try {
      for (const pkg of readdirSync(root, { withFileTypes: true }).filter(
        (p) => p.isDirectory() && p.name.startsWith("Gyan.FFmpeg_"),
      )) {
        const location = join(root, pkg.name);
        candidates.push(join(location, "bin", exe));
        for (const version of readdirSync(location, {
          withFileTypes: true,
        }).filter((p) => p.isDirectory() && /^ffmpeg[-_]/i.test(p.name)))
          candidates.push(join(location, version.name, "bin", exe));
      }
    } catch {
      /* An unavailable optional installation directory is skipped. */
    }
  }
  return candidates;
}
export function resolveMediaTool(
  tool: MediaTool,
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
) {
  const explicit =
    env[tool === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"]?.trim();
  if (explicit) return explicit;
  const exe = platform === "win32" ? `${tool}.exe` : tool;
  const peer = env[tool === "ffmpeg" ? "FFPROBE_PATH" : "FFMPEG_PATH"]?.trim();
  const candidates = [
    ...(peer ? [join(dirname(peer), exe)] : []),
    join(process.cwd(), "tools", "ffmpeg", "bin", exe),
    ...(platform === "win32" ? windowsMediaCandidates(tool, env) : []),
  ];
  return candidates.find((p) => existsSync(p)) ?? tool;
}
export function mediaSetupCommand(
  platform: NodeJS.Platform = process.platform,
) {
  return platform === "win32"
    ? "winget install --id Gyan.FFmpeg -e"
    : platform === "darwin"
      ? "brew install ffmpeg"
      : "sudo apt-get update && sudo apt-get install -y ffmpeg";
}
export class MissingMediaToolsError extends Error {
  constructor() {
    super(
      "The server cannot find FFmpeg/ffprobe. On the computer running MindMitra, run npm run setup:media -- --install, then restart the app. Custom installations can set FFMPEG_PATH and FFPROBE_PATH in .env.",
    );
    this.name = "MissingMediaToolsError";
  }
}
