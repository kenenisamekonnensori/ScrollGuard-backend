import { Router } from "express";

import { authRouter } from "@/modules/auth/auth.routes.js";
import { featureRouter } from "@/modules/feature/feature.routes.js";
import { guestRouter } from "@/modules/guest/guest.routes.js";
import { subscriptionRouter } from "@/modules/subscription/subscription.routes.js";
import { userRouter } from "@/modules/user/user.routes.js";
import { usageRouter } from "@/modules/usage/usage.routes.js";
import { healthRouter } from "@/routes/health.route.js";

export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/features", featureRouter);
apiV1Router.use("/guest", guestRouter);
apiV1Router.use("/subscription", subscriptionRouter);
apiV1Router.use("/user", userRouter);
apiV1Router.use("/usage", usageRouter);
