import express from "express";
import morgan from "morgan";

import { env } from "@/config/env.js";
import { errorHandler, notFoundHandler } from "@/middlewares/error-handler.js";
import { resolveActor } from "@/middlewares/identity.middleware.js";
import { applySecurityMiddleware } from "@/middlewares/security.js";
import { apiV1Router } from "@/routes/index.js";

const app = express();

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

applySecurityMiddleware(app);

app.use("/api/v1", resolveActor, apiV1Router);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
