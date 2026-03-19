import { type NextFunction, type Request, type Response } from "express";

import { sendSuccess } from "../../shared/utils/response";
import { googleAuth, login, signup, upgradeGuest } from "./auth.service";

export async function signupController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await signup(req.body);
    sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await login(req.body);
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
    const result = await googleAuth(req.body);
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
    const result = await upgradeGuest(req.body);
    sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
}
