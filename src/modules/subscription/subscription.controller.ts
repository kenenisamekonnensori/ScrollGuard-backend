import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "../../middlewares/error-handler";
import { requireValidatedBody } from "../../middlewares/validate.middleware";
import { sendSuccess } from "../../shared/utils/response";
import { getSubscriptionStatus, upgradeSubscription } from "./subscription.service";
import type { UpgradeSubscriptionInput } from "./subscription.validation";

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
