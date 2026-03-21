import { Router } from "express";

import { initGuestController } from "./guest.controller";

export const guestRouter = Router();

guestRouter.post("/init", initGuestController);
