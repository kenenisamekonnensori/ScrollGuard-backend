import { type NextFunction, type Request, type Response, Router } from "express";

import { AppError } from "@/middlewares/error-handler.js";
import { requireAuth } from "@/middlewares/identity.middleware.js";
import { validateRequest } from "@/middlewares/validate.middleware.js";
import { analyzeAiController } from "@/modules/ai/ai.controller.js";
import { aiAnalyzeSchema } from "@/modules/ai/ai.validation.js";
import { hasAccess } from "@/modules/feature/feature.service.js";

async function requireAiInsightsAccess(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      next(new AppError("Actor context is missing", 500, true, "INTERNAL_ERROR"));
      return;
    }

    const allowed = await hasAccess(req.actor, "AI_INSIGHTS");

    if (!allowed) {
      next(new AppError("Premium subscription required", 403, true, "PREMIUM_REQUIRED"));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export const aiRouter = Router();

aiRouter.post(
  "/analyze",
  requireAuth,
  requireAiInsightsAccess,
  validateRequest({ body: aiAnalyzeSchema }),
  analyzeAiController
);
