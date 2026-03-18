import { z } from "zod";

export const signupSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const loginSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required")
});

export const googleAuthSchema = z.object({
  googleId: z.string().min(1, "googleId is required"),
  email: z.email().toLowerCase().trim()
});

export const upgradeGuestSchema = z.object({
  guestId: z.string().min(1, "guestId is required"),
  email: z.email().toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters")
});
