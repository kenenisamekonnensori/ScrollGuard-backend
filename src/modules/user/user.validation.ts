import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    preferences: z.record(z.string(), z.unknown()).optional()
  })
  .refine((input) => input.name !== undefined || input.preferences !== undefined, {
    message: "At least one field must be provided"
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
