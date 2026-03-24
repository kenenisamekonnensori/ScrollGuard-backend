import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "@/middlewares/error-handler.js";
import { requireValidatedBody, requireValidatedQuery } from "@/middlewares/validate.middleware.js";
import { sendSuccess } from "@/shared/utils/response.js";
import { getUsageStats, trackUsage } from "@/modules/usage/usage.service.js";
import type { TrackUsageInput, UsageStatsQuery } from "@/modules/usage/usage.validation.js";

function requireActor(req: Request) {
  if (!req.actor) {
    throw new AppError("Actor context is missing", 500, true, "INTERNAL_ERROR");
  }

  return req.actor;
}

export async function trackUsageController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await trackUsage(requireActor(req), requireValidatedBody<TrackUsageInput>(req));
    sendSuccess(res, 201, { recorded: true });
  } catch (error) {
    next(error);
  }
}

export async function usageStatsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getUsageStats(
      requireActor(req),
      requireValidatedQuery<UsageStatsQuery>(req)
    );

    sendSuccess(res, 200, stats);
  } catch (error) {
    next(error);
  }
}
