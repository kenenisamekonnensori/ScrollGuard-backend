import { type NextFunction, type Request, type Response } from "express";

import { sendSuccess } from "@/shared/utils/response.js";
import { parseGuestId } from "@/shared/utils/guest-id.js";
import { googleAuth, login, signup, upgradeGuest } from "@/modules/auth/auth.service.js";
import type { GoogleAuthInput, LoginInput, SignupInput, UpgradeGuestInput } from "@/modules/auth/auth.validation.js";
import { requireValidatedBody } from "@/middlewares/validate.middleware.js";

export async function signupController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await signup(requireValidatedBody<SignupInput>(req), {
      guestId: parseGuestId(req.header("x-guest-id"))
    });
    sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await login(requireValidatedBody<LoginInput>(req), {
      guestId: parseGuestId(req.header("x-guest-id"))
    });
    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}

export async function googleAuthController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await googleAuth(requireValidatedBody<GoogleAuthInput>(req));
    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}

export async function upgradeGuestController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await upgradeGuest(requireValidatedBody<UpgradeGuestInput>(req));
    sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
}
