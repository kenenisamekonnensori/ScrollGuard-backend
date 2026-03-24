import type { Actor } from "@/shared/types/actor.js";

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;

      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
