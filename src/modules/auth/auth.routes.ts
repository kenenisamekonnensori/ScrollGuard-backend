import { Router } from "express";

import { validateRequest } from "@/middlewares/validate.middleware.js";
import {
  googleAuthController,
  loginController,
  signupController,
  upgradeGuestController
} from "@/modules/auth/auth.controller.js";
import { googleAuthSchema, loginSchema, signupSchema, upgradeGuestSchema } from "@/modules/auth/auth.validation.js";

export const authRouter = Router();

authRouter.post("/signup", validateRequest({ body: signupSchema }), signupController);
authRouter.post("/login", validateRequest({ body: loginSchema }), loginController);
authRouter.post("/google", validateRequest({ body: googleAuthSchema }), googleAuthController);
authRouter.post(
  "/upgrade-guest",
  validateRequest({ body: upgradeGuestSchema }),
  upgradeGuestController
);
