import type { Actor } from "@/shared/types/actor.js";
import { UsageModel } from "@/modules/usage/usage.model.js";
import type { TrackUsageInput, UsageStatsQuery } from "@/modules/usage/usage.validation.js";

interface UsageHistoryPoint {
  date: string;
  scrolls: number;
  sessionDuration: number;
}

interface UsageStatsResult {
  period: UsageStatsQuery["range"];
  totalScrolls: number;
  totalSessionDuration: number;
  avgSessionDuration: number;
  eventsCount: number;
  history: UsageHistoryPoint[];
}

function getWindowStart(range: UsageStatsQuery["range"]): Date {
  const now = new Date();

  // Use UTC boundaries to avoid per-timezone drift in day/week/month windows.
  if (range === "day") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  if (range === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export async function trackUsage(actor: Actor, input: TrackUsageInput): Promise<void> {
  await UsageModel.create({
    actorId: actor.id,
    actorType: actor.type,
    sessionDuration: input.sessionDuration,
    scrollCount: input.scrollCount,
    timestamp: input.timestamp ?? new Date()
  });
}

export async function getUsageStats(
  actor: Actor,
  query: UsageStatsQuery
): Promise<UsageStatsResult> {
  const fromDate = getWindowStart(query.range);

  const [totals, history] = await Promise.all([
    UsageModel.aggregate([
      {
        $match: {
          actorId: actor.id,
          actorType: actor.type,
          timestamp: { $gte: fromDate }
        }
      },
      {
        $group: {
          _id: null,
          totalScrolls: { $sum: "$scrollCount" },
          totalSessionDuration: { $sum: "$sessionDuration" },
          avgSessionDuration: { $avg: "$sessionDuration" },
          eventsCount: { $sum: 1 }
        }
      }
    ]),
    UsageModel.aggregate([
      {
        $match: {
          actorId: actor.id,
          actorType: actor.type,
          timestamp: { $gte: fromDate }
        }
      },
      {
        // Group by UTC date string for a compact timeline graph source.
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp",
              timezone: "UTC"
            }
          },
          scrolls: { $sum: "$scrollCount" },
          sessionDuration: { $sum: "$sessionDuration" }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          scrolls: 1,
          sessionDuration: 1
        }
      },
      { $sort: { date: 1 } }
    ])
  ]);

  const totalsRow = (totals[0] as {
    totalScrolls: number;
    totalSessionDuration: number;
    avgSessionDuration: number;
    eventsCount: number;
  } | undefined) ?? {
    totalScrolls: 0,
    totalSessionDuration: 0,
    avgSessionDuration: 0,
    eventsCount: 0
  };

  return {
    period: query.range,
    totalScrolls: totalsRow.totalScrolls,
    totalSessionDuration: totalsRow.totalSessionDuration,
    avgSessionDuration: totalsRow.avgSessionDuration,
    eventsCount: totalsRow.eventsCount,
    history: history as UsageHistoryPoint[]
  };
}
