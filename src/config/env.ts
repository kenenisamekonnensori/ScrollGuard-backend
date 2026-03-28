import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(1).default("dev-jwt-secret"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  GOOGLE_CLIENT_IDS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    ),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1).default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).default(20),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().min(0).default(2),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5000)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment variables: ${details}`);
}

if (parsedEnv.data.NODE_ENV === "production" && parsedEnv.data.JWT_SECRET === "dev-jwt-secret") {
  throw new Error("Invalid environment variables: JWT_SECRET must be explicitly set in production");
}

export const env = parsedEnv.data;
