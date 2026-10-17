import { z } from "zod";
export const questionInput = z
  .object({
    number: z.number().int().positive(),
    text: z.string().min(1).max(20000),
    type: z.enum(["MCQ", "DESCRIPTIVE"]).default("MCQ"),
    options: z.array(z.string().min(1).max(4000)).max(8),
    subject: z.string().min(1).max(120),
    topic: z.string().max(120),
    language: z.enum(["en", "hi"]),
    sourcePage: z.number().int().positive(),
    answer: z.number().int().nonnegative().nullable(),
    keyStatus: z.enum(["VERIFIED", "UNAVAILABLE", "DISPUTED"]),
    keyReference: z.string().max(2000),
    explanation: z.string().max(20000).optional(),
  })
  .superRefine((q, c) => {
    if (q.type === "MCQ" && q.options.length < 2)
      c.addIssue({
        code: "custom",
        message: "MCQs require at least two options",
      });
    if (q.answer !== null && q.answer >= q.options.length)
      c.addIssue({ code: "custom", message: "Answer out of range" });
    if (q.type === "DESCRIPTIVE" && q.answer !== null)
      c.addIssue({
        code: "custom",
        message: "Descriptive questions cannot be auto-scored",
      });
    if (q.keyStatus === "VERIFIED" && (!q.keyReference || q.answer === null))
      c.addIssue({
        code: "custom",
        message: "Verified key requires answer and reference",
      });
  });
export const importInput = z
  .object({
    examId: z.string(),
    year: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 1),
    stage: z.string().min(1).max(100),
    shift: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    marks: z.number().positive().max(100),
    penalty: z.number().min(0).max(100),
    durationMinutes: z.number().int().min(1).max(600),
    source: z.object({
      title: z.string().min(1),
      url: z
        .url()
        .refine((s) => s.startsWith("https://"), "HTTPS source required"),
      checksum: z.string().regex(/^[a-f0-9]{64}$/),
      permission: z.enum(["PENDING", "AUTHORIZED", "DENIED"]),
      permissionEvidence: z.string().min(1).max(5000),
    }),
    questions: z.array(questionInput).min(1).max(1000),
  })
  .refine(
    (d) =>
      new Set(d.questions.map((q) => q.number)).size === d.questions.length,
    "Duplicate question numbers",
  );
export const profileInput = z.object({
  name: z.string().trim().min(1).max(80),
  language: z.enum(["en", "hi"]),
  dailyGoal: z.number().int().min(1).max(500),
  targetExams: z.array(z.string()).max(10),
  reminder: z.boolean(),
  targetDate: z.string().nullable().optional(),
});
