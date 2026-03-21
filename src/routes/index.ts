import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes";
import { featureRouter } from "../modules/feature/feature.routes";
import { guestRouter } from "../modules/guest/guest.routes";
import { userRouter } from "../modules/user/user.routes";
import { usageRouter } from "../modules/usage/usage.routes";
import { healthRouter } from "./health.route";

export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/features", featureRouter);
apiV1Router.use("/guest", guestRouter);
apiV1Router.use("/user", userRouter);
apiV1Router.use("/usage", usageRouter);
