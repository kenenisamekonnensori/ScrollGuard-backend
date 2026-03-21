import { Router } from "express";

import { requireAuth } from "../../middlewares/identity.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  getSubscriptionStatusController,
  upgradeSubscriptionController
} from "./subscription.controller";
import { upgradeSubscriptionSchema } from "./subscription.validation";

export const subscriptionRouter = Router();

subscriptionRouter.get("/status", requireAuth, getSubscriptionStatusController);
subscriptionRouter.post(
  "/upgrade",
  requireAuth,
  validateRequest({ body: upgradeSubscriptionSchema }),
  upgradeSubscriptionController
);
