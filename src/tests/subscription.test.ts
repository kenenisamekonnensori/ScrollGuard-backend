import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { SignJWT } from "jose";
import request from "supertest";

import { env } from "@/config/env.js";
import { SubscriptionModel } from "@/modules/subscription/subscription.model.js";
import { UserModel } from "@/modules/user/user.model.js";

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
  updateMany: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
    exec: () => Promise<unknown>;
  };
  create: (input: unknown) => Promise<unknown>;
};

const userModel = UserModel as unknown as UserModelLike;
const subscriptionModel = SubscriptionModel as unknown as SubscriptionModelLike;

const originalUserFindById = userModel.findById;
const originalSubscriptionFindOne = subscriptionModel.findOne;
const originalSubscriptionUpdateMany = subscriptionModel.updateMany;
const originalSubscriptionCreate = subscriptionModel.create;

function restoreModels(): void {
  userModel.findById = originalUserFindById;
  subscriptionModel.findOne = originalSubscriptionFindOne;
  subscriptionModel.updateMany = originalSubscriptionUpdateMany;
  subscriptionModel.create = originalSubscriptionCreate;
}

function mockNoopSubscriptionUpdateMany(): void {
  subscriptionModel.updateMany = () => ({
    exec: async () => ({ acknowledged: true })
  });
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
    const { app } = await import("@/app.js");

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
    mockNoopSubscriptionUpdateMany();
    subscriptionModel.findOne = () => ({
      sort: () => ({ exec: async () => null })
    });

    const token = await createUserToken("user_sub_001");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .get("/api/v1/subscription/status")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, "none");
    assert.equal(response.body.data.isPremium, false);
    assert.equal(response.body.data.plan, null);
    assert.equal(response.body.data.provider, null);
  });

  it("syncs stale premium flag to false when no active subscription exists", async () => {
    let saveCalled = 0;
    const user: UserDocStub = {
      _id: { toString: () => "user_sub_001_sync" },
      isPremium: true,
      save: async () => {
        saveCalled += 1;
      }
    };

    userModel.findById = () => ({ exec: async () => user });
    mockNoopSubscriptionUpdateMany();
    subscriptionModel.findOne = () => ({
      sort: () => ({ exec: async () => null })
    });

    const token = await createUserToken("user_sub_001_sync");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .get("/api/v1/subscription/status")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "none");
    assert.equal(response.body.data.isPremium, false);
    assert.equal(user.isPremium, false);
    assert.equal(saveCalled, 1);
  });

  it("syncs premium flag to true when active subscription exists", async () => {
    let saveCalled = 0;
    const user: UserDocStub = {
      _id: { toString: () => "user_sub_001_promote" },
      isPremium: false,
      save: async () => {
        saveCalled += 1;
      }
    };

    const activeSubscription = {
      plan: "monthly" as const,
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      provider: "mock"
    };

    userModel.findById = () => ({ exec: async () => user });
    mockNoopSubscriptionUpdateMany();
    subscriptionModel.findOne = () => ({
      sort: () => ({ exec: async () => activeSubscription })
    });

    const token = await createUserToken("user_sub_001_promote");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .get("/api/v1/subscription/status")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "active");
    assert.equal(response.body.data.provider, "mock");
    assert.equal(user.isPremium, true);
    assert.equal(saveCalled, 1);
  });

  it("creates active subscription and sets premium on upgrade", async () => {
    const user: UserDocStub = {
      _id: { toString: () => "user_sub_002" },
      isPremium: false,
      save: async () => {}
    };

    let createCalled = false;

    userModel.findById = () => ({ exec: async () => user });
    mockNoopSubscriptionUpdateMany();
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
        currentPeriodEnd: body.currentPeriodEnd,
        provider: "mock"
      };
    };

    const token = await createUserToken("user_sub_002");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/subscription/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "monthly" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.idempotent, false);
    assert.equal(response.body.data.subscription.status, "active");
    assert.equal(response.body.data.subscription.plan, "monthly");
    assert.equal(response.body.data.subscription.provider, "mock");
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
      currentPeriodEnd: new Date("2027-01-01T00:00:00.000Z"),
      provider: "mock"
    };

    let createCalled = false;

    userModel.findById = () => ({ exec: async () => user });
    mockNoopSubscriptionUpdateMany();
    subscriptionModel.findOne = () => ({
      sort: () => ({ exec: async () => activeSubscription })
    });
    subscriptionModel.create = async () => {
      createCalled = true;
      return activeSubscription;
    };

    const token = await createUserToken("user_sub_003");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/subscription/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "yearly" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.idempotent, true);
    assert.equal(response.body.data.subscription.plan, "yearly");
    assert.equal(response.body.data.subscription.provider, "mock");
    assert.equal(createCalled, false);
  });

  it("rejects plan change while active subscription exists", async () => {
    const user: UserDocStub = {
      _id: { toString: () => "user_sub_plan_conflict" },
      isPremium: true,
      save: async () => {}
    };

    const activeSubscription = {
      plan: "monthly" as const,
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      provider: "mock"
    };

    userModel.findById = () => ({ exec: async () => user });
    mockNoopSubscriptionUpdateMany();
    subscriptionModel.findOne = () => ({
      sort: () => ({ exec: async () => activeSubscription })
    });
    subscriptionModel.create = async () => {
      throw new Error("create should not be called");
    };

    const token = await createUserToken("user_sub_plan_conflict");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/subscription/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "yearly" });

    assert.equal(response.status, 409);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_INPUT");
  });

  it("rejects invalid upgrade plan", async () => {
    const token = await createUserToken("user_sub_004");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/subscription/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "weekly" });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_INPUT");
  });
});
