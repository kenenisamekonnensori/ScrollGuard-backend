import { Router } from "express";

import { requireAuth } from "@/middlewares/identity.middleware.js";
import { validateRequest } from "@/middlewares/validate.middleware.js";
import {
  getSubscriptionStatusController,
  upgradeSubscriptionController
} from "@/modules/subscription/subscription.controller.js";
import { upgradeSubscriptionSchema } from "@/modules/subscription/subscription.validation.js";

export const subscriptionRouter = Router();

subscriptionRouter.get("/status", requireAuth, getSubscriptionStatusController);
subscriptionRouter.post(
  "/upgrade",
  requireAuth,
  validateRequest({ body: upgradeSubscriptionSchema }),
  upgradeSubscriptionController
);
