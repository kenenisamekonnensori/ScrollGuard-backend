import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "@/middlewares/error-handler.js";
import { sendSuccess } from "@/shared/utils/response.js";
import { getProfile, updateProfile } from "@/modules/user/user.service.js";
import type { UpdateProfileInput } from "@/modules/user/user.validation.js";
import { requireValidatedBody } from "@/middlewares/validate.middleware.js";

function requireUserId(req: Request): string {
  if (!req.actor || req.actor.type !== "user") {
    throw new AppError("Authentication required", 401, true, "AUTH_REQUIRED");
  }

  return req.actor.id;
}

export async function getProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await getProfile(requireUserId(req));
    sendSuccess(res, 200, profile);
  } catch (error) {
    next(error);
  }
}

export async function updateProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await updateProfile(
      requireUserId(req),
      requireValidatedBody<UpdateProfileInput>(req)
    );

    sendSuccess(res, 200, profile);
  } catch (error) {
    next(error);
  }
}
