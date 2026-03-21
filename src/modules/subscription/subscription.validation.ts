import { z } from "zod";

export const upgradeSubscriptionSchema = z.object({
  plan: z.enum(["monthly", "yearly"])
});

export type UpgradeSubscriptionInput = z.infer<typeof upgradeSubscriptionSchema>;
