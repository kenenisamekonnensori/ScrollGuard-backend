import type { Actor } from "./actor";

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

export {};
