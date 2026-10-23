import { z } from "zod";
export const MAX_VIDEO_BYTES = 25_000_000;
export const MAX_VIDEO_SECONDS = 180;
export const MAX_DAILY_VIDEOS = 20;
export const EDUCATIONAL_CATEGORIES = [
  "General education",
  "Mathematics",
  "Science",
  "History",
  "Study skills",
  "Reasoning",
  "English",
  "Current affairs",
] as const;
export const videoMetadata = z.object({
  title: z.string().trim().min(3).max(200),
  creator: z.string().trim().min(2).max(100),
  category: z.enum(EDUCATIONAL_CATEGORIES).default("General education"),
  learningObjective: z.string().trim().min(20).max(3000).default(""),
  rightsConfirmed: z.literal("yes"),
  policyConfirmed: z.literal("yes"),
});
export const videoReview = z
  .object({
    decision: z.enum(["APPROVE", "REJECT", "REVOKE"]),
    note: z.string().trim().min(15).max(3000),
    watchedInFull: z.boolean().default(false),
    educational: z.boolean().default(false),
    noNudity: z.boolean().default(false),
    noAbuse: z.boolean().default(false),
    noPromotion: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (
      v.decision === "APPROVE" &&
      ![
        v.watchedInFull,
        v.educational,
        v.noNudity,
        v.noAbuse,
        v.noPromotion,
      ].every(Boolean)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Approval requires watching the full video and confirming every educational and safety check",
      });
  });
export function videoMime(bytes: Buffer) {
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString() === "ftyp")
    return "video/mp4";
  if (
    bytes.length >= 4 &&
    bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  )
    return "video/webm";
  throw Error("Only valid MP4 or WebM videos are accepted");
}
export function mediaRange(header: string | null, size: number) {
  if (!header) return null;
  const match = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) throw Error("Invalid byte range");
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end = match[1]
    ? match[2]
      ? Math.min(size - 1, Number(match[2]))
      : size - 1
    : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    throw Error("Invalid byte range");
  return { start, end };
}
