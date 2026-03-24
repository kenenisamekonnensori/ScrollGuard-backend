import { Router } from "express";

import { validateRequest } from "@/middlewares/validate.middleware.js";
import { trackUsageController, usageStatsController } from "@/modules/usage/usage.controller.js";
import { trackUsageSchema, usageStatsQuerySchema } from "@/modules/usage/usage.validation.js";

export const usageRouter = Router();

usageRouter.post("/track", validateRequest({ body: trackUsageSchema }), trackUsageController);
usageRouter.get("/stats", validateRequest({ query: usageStatsQuerySchema }), usageStatsController);
