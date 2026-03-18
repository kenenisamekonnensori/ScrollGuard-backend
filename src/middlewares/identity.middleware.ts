import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { type NextFunction, type Request, type Response } from "express";

import { env } from "../config/env";
import type { Actor } from "../shared/types/actor";

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

function decodeJwtSub(token: string): string | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const headerJson = Buffer.from(parts[0], "base64url").toString("utf8");
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const header = JSON.parse(headerJson) as { alg?: string; typ?: string };
    const payload = JSON.parse(payloadJson) as { sub?: string; exp?: number };

    if (header.alg !== "HS256") {
      return null;
    }

    const signedPart = `${parts[0]}.${parts[1]}`;
    const expectedSignature = createHmac("sha256", env.JWT_SECRET)
      .update(signedPart)
      .digest("base64url");

    const providedSignature = parts[2];
    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(providedSignature);

    if (expectedBuffer.length !== providedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
      return null;
    }

    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

function parseGuestId(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

export function resolveActor(req: Request, res: Response, next: NextFunction): void {
  const bearerToken = parseBearerToken(req.header("authorization"));

  if (bearerToken) {
    const userId = decodeJwtSub(bearerToken);

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
