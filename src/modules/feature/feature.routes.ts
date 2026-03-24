import { Router } from "express";

import { getFeaturesController } from "@/modules/feature/feature.controller.js";

export const featureRouter = Router();

featureRouter.get("/", getFeaturesController);
