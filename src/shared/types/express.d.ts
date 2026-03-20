import type { Actor } from "./actor";

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
