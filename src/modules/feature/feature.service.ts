import type { Actor } from "@/shared/types/actor.js";
import { UserModel } from "@/modules/user/user.model.js";
import { FEATURE_DEFINITIONS, type FeatureDefinition } from "@/modules/feature/feature.constants.js";

export interface FeatureView {
  key: FeatureDefinition["key"];
  name: string;
  description: string;
  enabled: boolean;
  requiresAuth: boolean;
  requiresPremium: boolean;
}

async function resolvePremiumStatus(actor: Actor): Promise<boolean> {
  if (actor.type === "guest") {
    return false;
  }

  const user = await UserModel.findById(actor.id).select("isPremium").exec();

  // If a token is still valid but user record is missing, fail closed for premium.
  return user?.isPremium === true;
}

function evaluateFeatureAccess(
  actor: Actor,
  isPremium: boolean,
  feature: FeatureDefinition
): boolean {
  // Auth requirement is checked first because premium-only implies auth anyway.
  if (feature.requiresAuth && actor.type === "guest") {
    return false;
  }

  if (feature.requiresPremium && !isPremium) {
    return false;
  }

  return true;
}

export async function getFeaturesForActor(actor: Actor): Promise<FeatureView[]> {
  const isPremium = await resolvePremiumStatus(actor);

  return FEATURE_DEFINITIONS.map((feature) => ({
    key: feature.key,
    name: feature.name,
    description: feature.description,
    enabled: evaluateFeatureAccess(actor, isPremium, feature),
    requiresAuth: feature.requiresAuth,
    requiresPremium: feature.requiresPremium
  }));
}

export async function hasAccess(actor: Actor, featureKey: string): Promise<boolean> {
  const feature = FEATURE_DEFINITIONS.find((item) => item.key === featureKey);

  if (!feature) {
    return false;
  }

  const isPremium = await resolvePremiumStatus(actor);
  return evaluateFeatureAccess(actor, isPremium, feature);
}
