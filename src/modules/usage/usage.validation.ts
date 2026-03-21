import { z } from "zod";

export const trackUsageSchema = z.object({
  sessionDuration: z.number().min(0),
  scrollCount: z.number().int().min(0),
  timestamp: z.coerce.date().optional()
});

export const usageStatsQuerySchema = z.object({
  range: z.enum(["day", "week", "month"]).default("week")
});

export type TrackUsageInput = z.infer<typeof trackUsageSchema>;
export type UsageStatsQuery = z.infer<typeof usageStatsQuerySchema>;
