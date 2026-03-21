import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { SignJWT } from "jose";
import request from "supertest";

import { env } from "../config/env";
import { SubscriptionModel } from "../modules/subscription/subscription.model";
import { UserModel } from "../modules/user/user.model";

type UserDocStub = {
  _id: { toString(): string };
  isPremium: boolean;
  save: () => Promise<void>;
};

type UserModelLike = {
  findById: (id: string) => { exec: () => Promise<unknown> };
};

type SubscriptionModelLike = {
  findOne: (filter: Record<string, unknown>) => {
    sort: (s: unknown) => { exec: () => Promise<unknown> };
  };
  create: (input: unknown) => Promise<unknown>;
};

const userModel = UserModel as unknown as UserModelLike;
const subscriptionModel = SubscriptionModel as unknown as SubscriptionModelLike;

const originalUserFindById = userModel.findById;
const originalSubscriptionFindOne = subscriptionModel.findOne;
const originalSubscriptionCreate = subscriptionModel.create;

function restoreModels(): void {
  userModel.findById = originalUserFindById;
  subscriptionModel.findOne = originalSubscriptionFindOne;
  subscriptionModel.create = originalSubscriptionCreate;
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

describe("Subscription Endpoints", () => {
  it("rejects guest actor for subscription endpoints", async () => {
    const { app } = await import("../app");

    const statusResponse = await request(app).get("/api/v1/subscription/status");
    const upgradeResponse = await request(app)
      .post("/api/v1/subscription/upgrade")
      .send({ plan: "monthly" });

    assert.equal(statusResponse.status, 401);
    assert.equal(statusResponse.body.error.code, "AUTH_REQUIRED");

    assert.equal(upgradeResponse.status, 401);
    assert.equal(upgradeResponse.body.error.code, "AUTH_REQUIRED");
  });

  it("returns non-active status when user has no active subscription", async () => {
    const user: UserDocStub = {
      _id: { toString: () => "user_sub_001" },
      isPremium: false,
      save: async () => {}
    };

    userModel.findById = () => ({ exec: async () => user });
    subscriptionModel.findOne = () => ({
      sort: () => ({ exec: async () => null })
    });

    const token = await createUserToken("user_sub_001");
    const { app } = await import("../app");

    const response = await request(app)
      .get("/api/v1/subscription/status")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, "none");
    assert.equal(response.body.data.isPremium, false);
    assert.equal(response.body.data.plan, null);
  });

  it("creates active subscription and sets premium on upgrade", async () => {
    const user: UserDocStub = {
      _id: { toString: () => "user_sub_002" },
      isPremium: false,
      save: async () => {}
    };

    let createCalled = false;

    userModel.findById = () => ({ exec: async () => user });
    subscriptionModel.findOne = () => ({
      sort: () => ({ exec: async () => null })
    });
    subscriptionModel.create = async (input: unknown) => {
      createCalled = true;
      const body = input as {
        plan: "monthly" | "yearly";
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
      };

      return {
        plan: body.plan,
        currentPeriodStart: body.currentPeriodStart,
        currentPeriodEnd: body.currentPeriodEnd
      };
    };

    const token = await createUserToken("user_sub_002");
    const { app } = await import("../app");

    const response = await request(app)
      .post("/api/v1/subscription/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "monthly" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.idempotent, false);
    assert.equal(response.body.data.subscription.status, "active");
    assert.equal(response.body.data.subscription.plan, "monthly");
    assert.equal(user.isPremium, true);
    assert.equal(createCalled, true);
  });

  it("returns existing active subscription for repeated upgrade", async () => {
    const user: UserDocStub = {
      _id: { toString: () => "user_sub_003" },
      isPremium: true,
      save: async () => {}
    };

    const activeSubscription = {
      plan: "yearly" as const,
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2027-01-01T00:00:00.000Z")
    };

    let createCalled = false;

    userModel.findById = () => ({ exec: async () => user });
    subscriptionModel.findOne = () => ({
      sort: () => ({ exec: async () => activeSubscription })
    });
    subscriptionModel.create = async () => {
      createCalled = true;
      return activeSubscription;
    };

    const token = await createUserToken("user_sub_003");
    const { app } = await import("../app");

    const response = await request(app)
      .post("/api/v1/subscription/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "yearly" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.idempotent, true);
    assert.equal(response.body.data.subscription.plan, "yearly");
    assert.equal(createCalled, false);
  });

  it("rejects invalid upgrade plan", async () => {
    const token = await createUserToken("user_sub_004");
    const { app } = await import("../app");

    const response = await request(app)
      .post("/api/v1/subscription/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "weekly" });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_INPUT");
  });
});
