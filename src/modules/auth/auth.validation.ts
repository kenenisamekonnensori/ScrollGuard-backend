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
  idToken: z.string().min(1, "idToken is required")
});

export const upgradeGuestSchema = z.object({
  guestId: z.string().min(1, "guestId is required"),
  email: z.email().toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type UpgradeGuestInput = z.infer<typeof upgradeGuestSchema>;
