import { z } from "zod";
export const sourceRegionInput = z
  .object({
    page: z.number().int().min(1).max(80),
    rotation: z.number().min(-5).max(5).default(0),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .refine(
    (r) => r.x + r.width <= 1.00001 && r.y + r.height <= 1.00001,
    "Crop exceeds page bounds",
  );
export const sourceRegionsInput = z.array(sourceRegionInput).max(4);
export type SourceRegion = z.infer<typeof sourceRegionInput>;
