import { z } from "zod";

export const aiAnalyzeSchema = z.object({
  range: z.enum(["day", "week", "month"]).default("week")
});

export type AiAnalyzeInput = z.infer<typeof aiAnalyzeSchema>;
