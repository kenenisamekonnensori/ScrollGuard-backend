import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "../../middlewares/error-handler";
import { requireValidatedBody } from "../../middlewares/validate.middleware";
import { sendSuccess } from "../../shared/utils/response";
import { getSubscriptionStatus, upgradeSubscription } from "./subscription.service";
import type { UpgradeSubscriptionInput } from "./subscription.validation";

function requireUserId(req: Request): string {
  if (!req.actor || req.actor.type !== "user") {
    throw new AppError("Authentication required", 401, true, "AUTH_REQUIRED");
  }

  return req.actor.id;
}

export async function getSubscriptionStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getSubscriptionStatus(requireUserId(req));
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
      requireUserId(req),
      requireValidatedBody<UpgradeSubscriptionInput>(req)
    );

    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}
