export interface FeatureDefinition {
  key: "BASIC_TRACKING" | "SAVED_HISTORY" | "ADVANCED_ANALYTICS" | "AI_INSIGHTS";
  name: string;
  description: string;
  requiresAuth: boolean;
  requiresPremium: boolean;
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: "BASIC_TRACKING",
    name: "Basic Tracking",
    description: "Core usage tracking available to all actors",
    requiresAuth: false,
    requiresPremium: false
  },
  {
    key: "SAVED_HISTORY",
    name: "Saved History",
    description: "Persisted history for registered users",
    requiresAuth: true,
    requiresPremium: false
  },
  {
    key: "ADVANCED_ANALYTICS",
    name: "Advanced Analytics",
    description: "Premium-level analytics views",
    requiresAuth: true,
    requiresPremium: true
  },
  {
    key: "AI_INSIGHTS",
    name: "AI Insights",
    description: "AI-generated behavior insights",
    requiresAuth: true,
    requiresPremium: true
  }
];
