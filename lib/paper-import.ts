import { Prisma } from "@prisma/client";
import { z } from "zod";
import { importInput } from "@/lib/validation";
export async function importPaper(
  tx: Prisma.TransactionClient,
  d: z.infer<typeof importInput>,
) {
  const src = await tx.sourceDocument.upsert({
    where: {
      url_checksum: { url: d.source.url, checksum: d.source.checksum },
    },
    create: d.source,
    update: {},
  });
  const p = await tx.paper.create({
    data: {
      examId: d.examId,
      year: d.year,
      stage: d.stage,
      shift: d.shift,
      title: d.title,
      sourceId: src.id,
      marks: d.marks,
      penalty: d.penalty,
      durationMinutes: d.durationMinutes,
      questions: {
        create: d.questions.map((q) => ({
          number: q.number,
          text: q.text,
          type: q.type,
          options: q.options,
          subject: q.subject,
          topic: q.topic,
          language: q.language,
          sourcePage: q.sourcePage,
          explanation: q.explanation,
          keys: {
            create: {
              version: 1,
              answer: q.answer,
              status: q.keyStatus,
              reference: q.keyReference,
            },
          },
        })),
      },
    },
  });
  return p;
}
