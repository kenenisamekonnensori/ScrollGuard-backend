import { type NextFunction, type Request, type Response } from "express";

import { sendSuccess } from "../../shared/utils/response";
import { googleAuth, login, signup, upgradeGuest } from "./auth.service";
import type { GoogleAuthInput, LoginInput, SignupInput, UpgradeGuestInput } from "./auth.validation";
import { requireValidatedBody } from "../../middlewares/validate.middleware";

function readGuestIdFromRequest(req: Request): string | undefined {
  // Only explicit guest headers trigger migration for signup/login flows.
  const rawGuestId = req.header("x-guest-id");

  if (!rawGuestId) {
    return undefined;
  }

  const guestId = rawGuestId.trim();
  return guestId.length > 0 ? guestId : undefined;
}

export async function signupController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await signup(requireValidatedBody<SignupInput>(req), {
      guestId: readGuestIdFromRequest(req)
    });
    sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await login(requireValidatedBody<LoginInput>(req), {
      guestId: readGuestIdFromRequest(req)
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
