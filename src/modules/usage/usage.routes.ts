import { Router } from "express";

import { validateRequest } from "../../middlewares/validate.middleware";
import { trackUsageController, usageStatsController } from "./usage.controller";
import { trackUsageSchema, usageStatsQuerySchema } from "./usage.validation";

export const usageRouter = Router();

usageRouter.post("/track", validateRequest({ body: trackUsageSchema }), trackUsageController);
usageRouter.get("/stats", validateRequest({ query: usageStatsQuerySchema }), usageStatsController);
