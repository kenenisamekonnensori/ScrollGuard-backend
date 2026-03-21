import { Router } from "express";

import { getFeaturesController } from "./feature.controller";

export const featureRouter = Router();

featureRouter.get("/", getFeaturesController);
