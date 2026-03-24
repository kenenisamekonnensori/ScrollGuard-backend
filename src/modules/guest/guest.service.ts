import { AppError } from "@/middlewares/error-handler.js";
import type { Actor } from "@/shared/types/actor.js";

interface GuestInitResult {
  guestId: string;
  type: "guest";
}

export function initializeGuest(actor?: Actor): GuestInitResult {
  // `/guest/init` is idempotent: if middleware already resolved a guest,
  // return the same identity so clients can safely call this repeatedly.
  if (actor?.type === "guest") {
    return {
      guestId: actor.id,
      type: "guest"
    };
  }

  if (actor?.type === "user") {
    throw new AppError(
      "Authenticated users cannot initialize a guest session",
      403,
      true,
      "FORBIDDEN"
    );
  }

  throw new AppError("Guest actor is missing", 500, true, "INTERNAL_ERROR");
}
