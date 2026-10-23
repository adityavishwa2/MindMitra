import { describe, it, expect } from "vitest";
import {
  videoMetadata,
  videoReview,
  videoMime,
  mediaRange,
} from "../lib/video-policy";
import { inspectVideo } from "../lib/video-inspection";
import { fixtureVideo } from "./helpers/video";
describe("educational video moderation", () => {
  const metadata = {
    title: "Synthetic lesson",
    creator: "Fixture creator",
    category: "Science",
    learningObjective: "Teach a synthetic concept for isolated testing",
    rightsConfirmed: "yes",
    policyConfirmed: "yes",
  };
  const review = {
    decision: "APPROVE",
    note: "Watched the full synthetic educational fixture",
    watchedInFull: true,
    educational: true,
    noNudity: true,
    noAbuse: true,
    noPromotion: true,
  };
  it("requires educational metadata, creator rights and content policy consent", () => {
    expect(videoMetadata.safeParse(metadata).success).toBe(true);
    for (const change of [
      { category: "Entertainment" },
      { learningObjective: "fun" },
      { rightsConfirmed: "no" },
      { policyConfirmed: "no" },
    ])
      expect(videoMetadata.safeParse({ ...metadata, ...change }).success).toBe(
        false,
      );
  });
  it("requires every individual content check and full-video review for approval", () => {
    expect(videoReview.safeParse(review).success).toBe(true);
    for (const key of [
      "watchedInFull",
      "educational",
      "noNudity",
      "noAbuse",
      "noPromotion",
    ]) {
      expect(videoReview.safeParse({ ...review, [key]: false }).success).toBe(
        false,
      );
      const omitted = { ...review } as Record<string, unknown>;
      delete omitted[key];
      expect(videoReview.safeParse(omitted).success).toBe(false);
    }
    expect(
      videoReview.safeParse({
        decision: "REJECT",
        note: "Noneducational content is not accepted",
      }).success,
    ).toBe(true);
  });
  it("ignores a forged approval flag in upload metadata", () => {
    expect(
      videoMetadata.parse({ ...metadata, approved: true, status: "APPROVED" }),
    ).not.toHaveProperty("approved");
    expect(
      videoMetadata.parse({ ...metadata, status: "APPROVED" }),
    ).not.toHaveProperty("status");
  });
  it("rejects renamed non-video files", () => {
    expect(() => videoMime(Buffer.from("<html>not a video</html>"))).toThrow(
      "valid MP4",
    );
  });
  it("handles valid playback ranges and rejects invalid or multiple ranges", () => {
    expect(mediaRange(null, 100)).toBeNull();
    expect(mediaRange("bytes=2-9", 100)).toEqual({ start: 2, end: 9 });
    expect(mediaRange("bytes=98-", 100)).toEqual({ start: 98, end: 99 });
    expect(mediaRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    for (const header of [
      "bytes=100-",
      "bytes=10-5",
      "bytes=-0",
      "bytes=0-2,6-9",
      "bytes=-",
      "none",
    ])
      expect(() => mediaRange(header, 100)).toThrow();
  });
  it("inspects real synthetic video and normalizes browser-style streaming WebM", async () => {
    const result = await inspectVideo(fixtureVideo("blue", true));
    expect(result.mimeType).toBe("video/webm");
    expect(result.durationSeconds).toBeGreaterThanOrEqual(1);
    expect(result.durationSeconds).toBeLessThan(3);
    const second = await inspectVideo(result.bytes);
    expect(second.durationSeconds).toBe(result.durationSeconds);
  }, 30000);
  it("rejects malformed videos even when the file signature looks valid", async () => {
    await expect(
      inspectVideo(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3])),
    ).rejects.toThrow("could not be inspected");
  });
});
