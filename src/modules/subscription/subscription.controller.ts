import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "@/middlewares/error-handler.js";
import { requireValidatedBody } from "@/middlewares/validate.middleware.js";
import { sendSuccess } from "@/shared/utils/response.js";
import { getSubscriptionStatus, upgradeSubscription } from "@/modules/subscription/subscription.service.js";
import type { UpgradeSubscriptionInput } from "@/modules/subscription/subscription.validation.js";

function readAuthenticatedUserId(req: Request): string {
  // requireAuth middleware should guarantee this path; treat absence as wiring error.
  if (!req.actor || req.actor.type !== "user") {
    throw new AppError("Actor context is missing after auth middleware", 500, true, "INTERNAL_ERROR");
  }

  return req.actor.id;
}

export async function getSubscriptionStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getSubscriptionStatus(readAuthenticatedUserId(req));
    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}

export async function upgradeSubscriptionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await upgradeSubscription(
      readAuthenticatedUserId(req),
      requireValidatedBody<UpgradeSubscriptionInput>(req)
    );

    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}
