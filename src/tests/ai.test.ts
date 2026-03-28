import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { SignJWT } from "jose";
import request from "supertest";

import { env } from "@/config/env.js";
import { UsageModel } from "@/modules/usage/usage.model.js";
import { UserModel } from "@/modules/user/user.model.js";

type FindByIdResult = { select: (fields: string) => { exec: () => Promise<unknown> } };

type UserModelLike = {
  findById: (id: string) => FindByIdResult;
};

type UsageModelLike = {
  aggregate: (pipeline: unknown[]) => Promise<unknown[]>;
};

const userModel = UserModel as unknown as UserModelLike;
const usageModel = UsageModel as unknown as UsageModelLike;

const originalFindById = userModel.findById;
const originalAggregate = usageModel.aggregate;

function restoreModels(): void {
  userModel.findById = originalFindById;
  usageModel.aggregate = originalAggregate;
}

async function createUserToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

afterEach(() => {
  restoreModels();
});

describe("AI Analyze Endpoint", () => {
  it("rejects guest actors", async () => {
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/ai/analyze")
      .send({ range: "week" });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "AUTH_REQUIRED");
  });

  it("rejects non-premium users", async () => {
    userModel.findById = () => ({
      select: () => ({ exec: async () => ({ isPremium: false }) })
    });

    usageModel.aggregate = async () => {
      throw new Error("aggregate should not run for non-premium users");
    };

    const token = await createUserToken("user_ai_free_001");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/ai/analyze")
      .set("Authorization", `Bearer ${token}`)
      .send({ range: "week" });

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "PREMIUM_REQUIRED");
  });

  it("returns structured insight for premium users", async () => {
    userModel.findById = () => ({
      select: () => ({ exec: async () => ({ isPremium: true }) })
    });

    usageModel.aggregate = async () => [
      {
        totalScrolls: 420,
        totalSessionDuration: 1800,
        avgSessionDuration: 600,
        eventsCount: 3
      }
    ];

    const token = await createUserToken("user_ai_premium_001");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/ai/analyze")
      .set("Authorization", `Bearer ${token}`)
      .send({ range: "week" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(typeof response.body.data.summary, "string");
    assert.equal(response.body.data.riskLevel, "medium");
    assert.equal(Array.isArray(response.body.data.recommendations), true);
    assert.equal(typeof response.body.data.generatedAt, "string");
    assert.equal(response.body.data.metrics.period, "week");
    assert.equal(response.body.data.metrics.totalScrolls, 420);
  });

  it("rejects invalid range input", async () => {
    userModel.findById = () => ({
      select: () => ({ exec: async () => ({ isPremium: true }) })
    });

    const token = await createUserToken("user_ai_premium_002");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/ai/analyze")
      .set("Authorization", `Bearer ${token}`)
      .send({ range: "year" });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_INPUT");
  });

  it("returns graceful placeholder output for empty usage history", async () => {
    userModel.findById = () => ({
      select: () => ({ exec: async () => ({ isPremium: true }) })
    });

    usageModel.aggregate = async () => [];

    const token = await createUserToken("user_ai_premium_003");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/ai/analyze")
      .set("Authorization", `Bearer ${token}`)
      .send({ range: "day" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.riskLevel, "low");
    assert.equal(response.body.data.metrics.eventsCount, 0);
    assert.equal(response.body.data.metrics.totalScrolls, 0);
    assert.equal(response.body.data.metrics.totalSessionDuration, 0);
  });
});
