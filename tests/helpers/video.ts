import { execFileSync } from "node:child_process";
export function fixtureVideo(color = "blue", streaming = false) {
  return execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=320x240:r=10`,
      "-t",
      "2",
      "-c:v",
      "libvpx",
      "-deadline",
      "realtime",
      "-f",
      "webm",
      ...(streaming ? ["-live", "1"] : []),
      "pipe:1",
    ],
    { maxBuffer: 2_000_000, timeout: 15000 },
  );
}
