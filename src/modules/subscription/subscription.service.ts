import { AppError } from "../../middlewares/error-handler";
import { UserModel } from "../user/user.model";
import { SubscriptionModel } from "./subscription.model";
import type { UpgradeSubscriptionInput } from "./subscription.validation";

interface SubscriptionStatusView {
  status: "active" | "none";
  isPremium: boolean;
  plan: "monthly" | "yearly" | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  source: "mock";
}

interface UpgradeResult {
  subscription: SubscriptionStatusView;
  idempotent: boolean;
}

type UserDocLike = {
  _id: { toString(): string };
  isPremium: boolean;
  save: () => Promise<void>;
};

function buildStatusView(input: {
  status: "active" | "none";
  isPremium: boolean;
  plan?: "monthly" | "yearly";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}): SubscriptionStatusView {
  return {
    status: input.status,
    isPremium: input.isPremium,
    plan: input.plan ?? null,
    currentPeriodStart: input.currentPeriodStart ?? null,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    source: "mock"
  };
}

function calculatePeriodEnd(start: Date, plan: "monthly" | "yearly"): Date {
  // Mock plans use fixed durations to keep behavior deterministic in tests/review.
  const days = plan === "yearly" ? 365 : 30;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

async function findUserOrThrow(userId: string): Promise<UserDocLike> {
  const user = await UserModel.findById(userId).exec();

  if (!user) {
    throw new AppError("User not found", 404, true, "USER_NOT_FOUND");
  }

  return user as unknown as UserDocLike;
}

async function findActiveSubscription(userId: string) {
  return SubscriptionModel.findOne({
    userId,
    status: "active",
    currentPeriodEnd: { $gt: new Date() }
  })
    .sort({ currentPeriodEnd: -1 })
    .exec();
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatusView> {
  const user = await findUserOrThrow(userId);
  const activeSubscription = await findActiveSubscription(userId);

  if (!activeSubscription) {
    if (user.isPremium) {
      // Keep user flag consistent with active-subscription truth source.
      user.isPremium = false;
      await user.save();
    }

    return buildStatusView({
      status: "none",
      isPremium: false
    });
  }

  if (!user.isPremium) {
    user.isPremium = true;
    await user.save();
  }

  return buildStatusView({
    status: "active",
    isPremium: true,
    plan: activeSubscription.plan,
    currentPeriodStart: activeSubscription.currentPeriodStart,
    currentPeriodEnd: activeSubscription.currentPeriodEnd
  });
}

export async function upgradeSubscription(
  userId: string,
  input: UpgradeSubscriptionInput
): Promise<UpgradeResult> {
  const user = await findUserOrThrow(userId);
  const existingActive = await findActiveSubscription(userId);

  // Idempotent upgrade: return existing active subscription instead of creating duplicates.
  if (existingActive) {
    if (!user.isPremium) {
      user.isPremium = true;
      await user.save();
    }

    return {
      subscription: buildStatusView({
        status: "active",
        isPremium: true,
        plan: existingActive.plan,
        currentPeriodStart: existingActive.currentPeriodStart,
        currentPeriodEnd: existingActive.currentPeriodEnd
      }),
      idempotent: true
    };
  }

  const now = new Date();
  const created = await SubscriptionModel.create({
    userId,
    plan: input.plan,
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: calculatePeriodEnd(now, input.plan),
    provider: "mock",
    providerSubscriptionId: `mock_${userId}_${now.getTime()}`
  });

  if (!user.isPremium) {
    user.isPremium = true;
    await user.save();
  }

  return {
    subscription: buildStatusView({
      status: "active",
      isPremium: true,
      plan: created.plan,
      currentPeriodStart: created.currentPeriodStart,
      currentPeriodEnd: created.currentPeriodEnd
    }),
    idempotent: false
  };
}
