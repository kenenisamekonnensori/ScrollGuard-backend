import { Router } from "express";

import { validateRequest } from "../../middlewares/validate.middleware";
import {
  googleAuthController,
  loginController,
  signupController,
  upgradeGuestController
} from "./auth.controller";
import { googleAuthSchema, loginSchema, signupSchema, upgradeGuestSchema } from "./auth.validation";

export const authRouter = Router();

authRouter.post("/signup", validateRequest({ body: signupSchema }), signupController);
authRouter.post("/login", validateRequest({ body: loginSchema }), loginController);
authRouter.post("/google", validateRequest({ body: googleAuthSchema }), googleAuthController);
authRouter.post(
  "/upgrade-guest",
  validateRequest({ body: upgradeGuestSchema }),
  upgradeGuestController
);
