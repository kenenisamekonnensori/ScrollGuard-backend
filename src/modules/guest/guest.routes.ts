import { Router } from "express";

import { initGuestController } from "@/modules/guest/guest.controller.js";

export const guestRouter = Router();

guestRouter.post("/init", initGuestController);
