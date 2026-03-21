import { randomUUID } from "crypto";
import { type NextFunction, type Request, type Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env";
import { AppError } from "./error-handler";
import type { Actor } from "../shared/types/actor";
import { parseGuestId } from "../shared/utils/guest-id";

const jwtSecretKey = new TextEncoder().encode(env.JWT_SECRET);

function parseBearerToken(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

async function verifyJwtSub(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey, {
      algorithms: ["HS256"]
    });

    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function resolveActor(req: Request, res: Response, next: NextFunction): Promise<void> {
  const bearerToken = parseBearerToken(req.header("authorization"));

  if (bearerToken) {
    const userId = await verifyJwtSub(bearerToken);

    if (userId) {
      req.actor = {
        type: "user",
        id: userId
      } satisfies Actor;
      next();
      return;
    }
  }

  const guestId = parseGuestId(req.header("x-guest-id"));

  if (guestId) {
    req.actor = {
      type: "guest",
      id: guestId
    } satisfies Actor;
    next();
    return;
  }

  const createdGuestId = randomUUID();

  req.actor = {
    type: "guest",
    id: createdGuestId
  } satisfies Actor;

  res.setHeader("x-guest-id", createdGuestId);
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // User module endpoints must be inaccessible to guest actors.
  if (!req.actor || req.actor.type !== "user") {
    next(new AppError("Authentication required", 401, true, "AUTH_REQUIRED"));
    return;
  }

  next();
}
