import { Router } from "express";

import { requireAuth } from "@/middlewares/identity.middleware.js";
import { validateRequest } from "@/middlewares/validate.middleware.js";
import { getProfileController, updateProfileController } from "@/modules/user/user.controller.js";
import { updateProfileSchema } from "@/modules/user/user.validation.js";

export const userRouter = Router();

userRouter.get("/profile", requireAuth, getProfileController);
userRouter.patch(
  "/profile",
  requireAuth,
  validateRequest({ body: updateProfileSchema }),
  updateProfileController
);
