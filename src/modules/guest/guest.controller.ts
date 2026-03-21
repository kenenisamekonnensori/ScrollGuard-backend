import { type NextFunction, type Request, type Response } from "express";

import { sendSuccess } from "../../shared/utils/response";
import { initializeGuest } from "./guest.service";

export async function initGuestController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = initializeGuest(req.actor);
    res.header("x-guest-id", result.guestId);
    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}
