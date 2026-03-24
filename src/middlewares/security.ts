import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";

import { env } from "@/config/env.js";

export function applySecurityMiddleware(app: Express): void {
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-guest-id"]
    })
  );

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Too many requests. Please try again later." }
    })
  );

  app.use(hpp());

  // express-mongo-sanitize assigns req.query internally, which conflicts with
  // Express 5 getter-only query property. Sanitize objects in-place instead.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body) {
      mongoSanitize.sanitize(req.body);
    }

    if (req.params) {
      mongoSanitize.sanitize(req.params);
    }

    if (req.query) {
      mongoSanitize.sanitize(req.query);
    }

    next();
  });
  app.use(compression());

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));
}
