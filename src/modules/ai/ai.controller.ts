import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "@/middlewares/error-handler.js";
import { requireValidatedBody } from "@/middlewares/validate.middleware.js";
import { analyzeUsage } from "@/modules/ai/ai.service.js";
import type { AiAnalyzeInput } from "@/modules/ai/ai.validation.js";
import { sendSuccess } from "@/shared/utils/response.js";

function requireActor(req: Request) {
  if (!req.actor) {
    throw new AppError("Actor context is missing", 500, true, "INTERNAL_ERROR");
  }

  return req.actor;
}

export async function analyzeAiController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await analyzeUsage(
      requireActor(req),
      requireValidatedBody<AiAnalyzeInput>(req)
    );

    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}
