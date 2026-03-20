import { Router } from "express";

import { requireAuth } from "../../middlewares/identity.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { getProfileController, updateProfileController } from "./user.controller";
import { updateProfileSchema } from "./user.validation";

export const userRouter = Router();

userRouter.get("/profile", requireAuth, getProfileController);
userRouter.patch(
  "/profile",
  requireAuth,
  validateRequest({ body: updateProfileSchema }),
  updateProfileController
);
