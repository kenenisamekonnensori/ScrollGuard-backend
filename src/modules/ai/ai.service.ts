import { AppError } from "@/middlewares/error-handler.js";
import { UsageModel } from "@/modules/usage/usage.model.js";
import type { Actor } from "@/shared/types/actor.js";
import type { AiAnalyzeInput } from "@/modules/ai/ai.validation.js";

interface UsageSnapshot {
  totalScrolls: number;
  totalSessionDuration: number;
  avgSessionDuration: number;
  eventsCount: number;
}

export interface AiAnalyzeResult {
  summary: string;
  riskLevel: "low" | "medium" | "high";
  recommendations: string[];
  generatedAt: string;
  metrics: UsageSnapshot & {
    period: AiAnalyzeInput["range"];
  };
}

function getWindowStart(range: AiAnalyzeInput["range"]): Date {
  const now = new Date();

  if (range === "day") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  if (range === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function scoreRisk(snapshot: UsageSnapshot): "low" | "medium" | "high" {
  if (snapshot.totalScrolls >= 800 || snapshot.avgSessionDuration >= 900) {
    return "high";
  }

  if (snapshot.totalScrolls >= 300 || snapshot.avgSessionDuration >= 420) {
    return "medium";
  }

  return "low";
}

function buildRecommendations(riskLevel: "low" | "medium" | "high"): string[] {
  if (riskLevel === "high") {
    return [
      "Enable strict screen-time alerts during peak scrolling hours",
      "Use app-block sessions after long scrolling streaks",
      "Review your daily trend and set a reduced target for tomorrow"
    ];
  }

  if (riskLevel === "medium") {
    return [
      "Schedule one focused no-scroll block each day",
      "Turn on gentle reminders after each long session",
      "Track weekly trends and reduce one high-usage day"
    ];
  }

  return [
    "Maintain your current limits and consistency",
    "Keep daily check-ins to catch early spikes",
    "Experiment with one extra focus session this week"
  ];
}

function buildSummary(riskLevel: "low" | "medium" | "high", snapshot: UsageSnapshot): string {
  if (snapshot.eventsCount === 0) {
    return "Not enough usage data yet. Keep tracking to unlock more personalized insights.";
  }

  if (riskLevel === "high") {
    return "Your recent pattern shows sustained high-intensity scrolling. Consider tighter interruption strategies.";
  }

  if (riskLevel === "medium") {
    return "Your activity is moderate but trending toward longer sessions. Small behavior changes can improve control.";
  }

  return "Your scrolling pattern appears balanced. Keep reinforcing your current habits.";
}

function requireUserActor(actor: Actor): { type: "user"; id: string } {
  if (actor.type !== "user") {
    throw new AppError("Authentication required", 401, true, "AUTH_REQUIRED");
  }

  return {
    type: "user",
    id: actor.id
  };
}

export async function analyzeUsage(actor: Actor, input: AiAnalyzeInput): Promise<AiAnalyzeResult> {
  const userActor = requireUserActor(actor);
  const fromDate = getWindowStart(input.range);

  const totals = await UsageModel.aggregate([
    {
      $match: {
        actorId: userActor.id,
        actorType: "user",
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
  ]);

  const snapshot = (totals[0] as UsageSnapshot | undefined) ?? {
    totalScrolls: 0,
    totalSessionDuration: 0,
    avgSessionDuration: 0,
    eventsCount: 0
  };

  // Placeholder scoring stays deterministic so tests and clients have a stable contract.
  const riskLevel = scoreRisk(snapshot);

  return {
    summary: buildSummary(riskLevel, snapshot),
    riskLevel,
    recommendations: buildRecommendations(riskLevel),
    generatedAt: new Date().toISOString(),
    metrics: {
      period: input.range,
      totalScrolls: snapshot.totalScrolls,
      totalSessionDuration: snapshot.totalSessionDuration,
      avgSessionDuration: snapshot.avgSessionDuration,
      eventsCount: snapshot.eventsCount
    }
  };
}
