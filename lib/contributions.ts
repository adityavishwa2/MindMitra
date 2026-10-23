import { z } from "zod";
import { MAX_PDF_BYTES } from "./upload-limits";
export const MAX_CONTRIBUTION_BYTES = MAX_PDF_BYTES;
export const contributionInput = z.object({
  examId: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  stage: z.string().trim().min(1).max(100),
  shift: z.string().trim().min(1).max(100),
  title: z.string().trim().min(3).max(200),
  sourceUrl: z
    .url()
    .max(2000)
    .refine((v) => v.startsWith("https://"), "Use an HTTPS source URL"),
  permissionEvidence: z.string().trim().min(10).max(5000),
  rightsConfirmed: z.literal("yes"),
  publicAlias: z
    .string()
    .trim()
    .max(30)
    .regex(
      /^[a-zA-Z0-9 _-]*$/,
      "Alias may contain letters, numbers, spaces, underscores and hyphens",
    )
    .default(""),
});
export const reviewContributionInput = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REVOKE"]),
  note: z.string().trim().min(10).max(4000),
  payload: z.unknown().optional(),
});
export function assertPaperMatches(
  contribution: {
    examId: string;
    year: number;
    stage: string;
    shift: string;
    sourceUrl?: string;
  },
  paper: { examId: string; year: number; stage: string; shift: string },
) {
  if (/^urn:sha256:[a-f0-9]{64}$/.test(contribution.sourceUrl ?? "")) return;
  if (
    ["examId", "year", "stage", "shift"].some(
      (k) =>
        contribution[k as keyof typeof contribution] !==
        paper[k as keyof typeof paper],
    )
  )
    throw new Error(
      "Paper must match the submitted exam, year, stage and shift",
    );
}
export function contributionPoints(approvedPapers: number) {
  return approvedPapers * 10;
}
