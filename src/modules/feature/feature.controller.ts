import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "../../middlewares/error-handler";
import { sendSuccess } from "../../shared/utils/response";
import { getFeaturesForActor } from "./feature.service";

function requireActor(req: Request) {
  if (!req.actor) {
    throw new AppError("Actor context is missing", 500, true, "INTERNAL_ERROR");
  }

  return req.actor;
}

export async function getFeaturesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const features = await getFeaturesForActor(requireActor(req));
    sendSuccess(res, 200, { features });
  } catch (error) {
    next(error);
  }
}
