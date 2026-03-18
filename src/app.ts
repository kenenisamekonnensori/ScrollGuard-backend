import express from "express";
import morgan from "morgan";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { resolveActor } from "./middlewares/identity.middleware";
import { applySecurityMiddleware } from "./middlewares/security";
import { apiV1Router } from "./routes";

const app = express();

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

if (env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

applySecurityMiddleware(app);

app.use("/api/v1", resolveActor, apiV1Router);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
