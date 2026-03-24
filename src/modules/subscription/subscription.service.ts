import { AppError } from "@/middlewares/error-handler.js";
import { UserModel } from "@/modules/user/user.model.js";
import { SubscriptionModel } from "@/modules/subscription/subscription.model.js";
import type { UpgradeSubscriptionInput } from "@/modules/subscription/subscription.validation.js";

interface SubscriptionStatusView {
  status: "active" | "none";
  isPremium: boolean;
  plan: "monthly" | "yearly" | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  provider: string | null;
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
  provider?: string | null;
}): SubscriptionStatusView {
  return {
    status: input.status,
    isPremium: input.isPremium,
    plan: input.plan ?? null,
    currentPeriodStart: input.currentPeriodStart ?? null,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    provider: input.provider ?? null
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

async function expireStaleActiveSubscriptions(userId: string): Promise<void> {
  // Keep DB invariants aligned with business time windows before reads/creates.
  await SubscriptionModel.updateMany(
    {
      userId,
      status: "active",
      currentPeriodEnd: { $lte: new Date() }
    },
    { $set: { status: "expired" } }
  ).exec();
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatusView> {
  const user = await findUserOrThrow(userId);
  await expireStaleActiveSubscriptions(userId);
  const activeSubscription = await findActiveSubscription(userId);

  if (!activeSubscription) {
    if (user.isPremium) {
      // Keep user flag consistent with active-subscription truth source.
      user.isPremium = false;
      await user.save();
    }

    return buildStatusView({
      status: "none",
      isPremium: false,
      provider: null
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
    currentPeriodEnd: activeSubscription.currentPeriodEnd,
    provider: activeSubscription.provider ?? null
  });
}

export async function upgradeSubscription(
  userId: string,
  input: UpgradeSubscriptionInput
): Promise<UpgradeResult> {
  const user = await findUserOrThrow(userId);
  await expireStaleActiveSubscriptions(userId);
  const existingActive = await findActiveSubscription(userId);

  if (existingActive) {
    if (existingActive.plan !== input.plan) {
      throw new AppError(
        "Cannot change plan while an active subscription exists",
        409,
        true,
        "INVALID_INPUT"
      );
    }

    // Idempotency only applies when the requested plan matches current active plan.
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
        currentPeriodEnd: existingActive.currentPeriodEnd,
        provider: existingActive.provider ?? null
      }),
      idempotent: true
    };
  }

  const now = new Date();
  let created: {
    plan: "monthly" | "yearly";
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    provider?: string;
  };

  try {
    created = await SubscriptionModel.create({
      userId,
      plan: input.plan,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: calculatePeriodEnd(now, input.plan),
      provider: "mock",
      providerSubscriptionId: `mock_${userId}_${now.getTime()}`
    });
  } catch (error: unknown) {
    const maybeDupKey = error as { code?: number };

    if (maybeDupKey.code !== 11000) {
      throw new AppError("Failed to create subscription", 500, true, "INTERNAL_ERROR");
    }

    // Another concurrent request created the active row first; resolve deterministically.
    const currentActive = await findActiveSubscription(userId);

    if (!currentActive) {
      throw new AppError("Failed to create subscription", 500, true, "INTERNAL_ERROR");
    }

    if (currentActive.plan !== input.plan) {
      throw new AppError(
        "Cannot change plan while an active subscription exists",
        409,
        true,
        "INVALID_INPUT"
      );
    }

    if (!user.isPremium) {
      user.isPremium = true;
      await user.save();
    }

    return {
      subscription: buildStatusView({
        status: "active",
        isPremium: true,
        plan: currentActive.plan,
        currentPeriodStart: currentActive.currentPeriodStart,
        currentPeriodEnd: currentActive.currentPeriodEnd,
        provider: currentActive.provider ?? null
      }),
      idempotent: true
    };
  }

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
      currentPeriodEnd: created.currentPeriodEnd,
      provider: created.provider ?? null
    }),
    idempotent: false
  };
}
