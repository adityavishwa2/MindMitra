import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveMediaTool, MissingMediaToolsError } from "./media-tools";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, videoMime } from "./video-policy";
const exec = promisify(execFile);
const options = { timeout: 15_000, maxBuffer: 100_000, windowsHide: true };
async function probe(file: string) {
  const { stdout } = await exec(
    resolveMediaTool("ffprobe"),
    [
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-show_entries",
      "format=duration:stream=codec_type,codec_name,width,height,duration",
      "-of",
      "json",
      file,
    ],
    options,
  );
  return JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: {
      codec_type: string;
      codec_name: string;
      width: number;
      height: number;
      duration?: string;
    }[];
  };
}
export async function inspectVideo(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_VIDEO_BYTES)
    throw Error("Choose a video up to 25 MB");
  const mimeType = videoMime(bytes);
  const dir = await mkdtemp(join(tmpdir(), "mindmitra-video-"));
  try {
    const file = join(
      dir,
      mimeType === "video/mp4" ? "source.mp4" : "source.webm",
    );
    await writeFile(file, bytes, { mode: 0o600 });
    let info;
    let storedBytes = bytes;
    try {
      info = await probe(file);
      // Browser MediaRecorder produces streaming WebM without a duration/seek index.
      // Remux it locally; never fetch external URLs or re-encode supplied content.
      const duration = Number(
        info.format?.duration ||
          info.streams?.find((s) => s.codec_type === "video")?.duration,
      );
      if (!Number.isFinite(duration)) {
        const normalized = join(
          dir,
          mimeType === "video/mp4" ? "normalized.mp4" : "normalized.webm",
        );
        await exec(
          resolveMediaTool("ffmpeg"),
          [
            "-v",
            "error",
            "-nostdin",
            "-protocol_whitelist",
            "file,pipe",
            "-i",
            file,
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            "-c",
            "copy",
            "-t",
            "181",
            "-fs",
            "26000000",
            normalized,
          ],
          options,
        );
        info = await probe(normalized);
        storedBytes = await readFile(normalized);
        if (storedBytes.length > MAX_VIDEO_BYTES)
          throw Error("Normalized video exceeds 25 MB");
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT")
        throw new MissingMediaToolsError();
      throw Error(
        "Video could not be inspected. Upload a valid MP4/WebM with a readable duration.",
      );
    }
    const video = info.streams?.find((s) => s.codec_type === "video");
    const durationSeconds = Number(info.format?.duration || video?.duration);
    if (
      !video ||
      !(mimeType === "video/mp4" ? ["h264"] : ["vp8", "vp9", "av1"]).includes(
        video.codec_name,
      )
    )
      throw Error("Use H.264 MP4 or VP8/VP9/AV1 WebM video");
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > MAX_VIDEO_SECONDS
    )
      throw Error("Educational videos must be between 1 and 180 seconds");
    if (
      video.width < 16 ||
      video.height < 16 ||
      video.width > 3840 ||
      video.height > 3840
    )
      throw Error("Video dimensions must be between 16 and 3840 pixels");
    // These are file integrity checks, not visual/semantic content moderation.
    return { mimeType, durationSeconds, bytes: storedBytes };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
