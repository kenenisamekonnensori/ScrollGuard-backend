import { Router } from "express";

import { sendSuccess } from "../shared/utils/response";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  sendSuccess(res, 200, {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
