import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveMediaTool,
  windowsMediaCandidates,
  mediaSetupCommand,
} from "../lib/media-tools";
import { inspectVideo } from "../lib/video-inspection";
import { fixtureVideo } from "./helpers/video";
describe("Windows/server media setup", () => {
  it("respects explicit executable paths including spaces", () => {
    expect(
      resolveMediaTool(
        "ffprobe",
        { FFPROBE_PATH: "C:/My Tools/ffprobe.exe" },
        "win32",
      ),
    ).toBe("C:/My Tools/ffprobe.exe");
  });
  it("finds WinGet-installed binaries even without a refreshed PATH", async () => {
    const root = await mkdtemp(join(tmpdir(), "mindmitra-winget-"));
    try {
      const bin = join(
        root,
        "Microsoft",
        "WinGet",
        "Packages",
        "Gyan.FFmpeg_Microsoft.Winget.Source_test",
        "ffmpeg-8.0-full_build",
        "bin",
      );
      await mkdir(bin, { recursive: true });
      await writeFile(join(bin, "ffprobe.exe"), "fixture only");
      expect(
        windowsMediaCandidates("ffprobe", { LOCALAPPDATA: root }),
      ).toContain(join(bin, "ffprobe.exe"));
      expect(resolveMediaTool("ffprobe", { LOCALAPPDATA: root }, "win32")).toBe(
        join(bin, "ffprobe.exe"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("provides the Windows FFmpeg installation command", () =>
    expect(mediaSetupCommand("win32")).toBe(
      "winget install --id Gyan.FFmpeg -e",
    ));
  it("reports a missing configured tool with actionable instructions", async () => {
    const original = process.env.FFPROBE_PATH;
    process.env.FFPROBE_PATH = join(tmpdir(), "mindmitra-absent-tool.exe");
    try {
      await expect(inspectVideo(fixtureVideo())).rejects.toMatchObject({
        name: "MissingMediaToolsError",
        message: expect.stringContaining("npm run setup:media -- --install"),
      });
    } finally {
      if (original === undefined) delete process.env.FFPROBE_PATH;
      else process.env.FFPROBE_PATH = original;
    }
  });
});
