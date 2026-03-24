import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { UserModel } from "@/modules/user/user.model.js";
import { UsageModel } from "@/modules/usage/usage.model.js";

type FindOneResult = { exec: () => Promise<unknown> };

type UserModelLike = {
  findOne: (filter: unknown) => FindOneResult;
  create: (input: unknown) => Promise<unknown>;
};

const userModel = UserModel as unknown as UserModelLike;
const usageModel = UsageModel as unknown as {
  updateMany: (filter: unknown, update: unknown) => { exec: () => Promise<unknown> };
};
const originalFindOne = userModel.findOne;
const originalCreate = userModel.create;
const originalUsageUpdateMany = usageModel.updateMany;

function restoreUserModel(): void {
  userModel.findOne = originalFindOne;
  userModel.create = originalCreate;
  usageModel.updateMany = originalUsageUpdateMany;
}

afterEach(() => {
  restoreUserModel();
});

describe("Auth Signup Endpoint", () => {
  it("returns 201 and does not crash on query assignment", async () => {
    usageModel.updateMany = () => ({ exec: async () => ({ modifiedCount: 0 }) });

    userModel.findOne = () => ({ exec: async () => null });
    userModel.create = async (input: unknown) => {
      const data = input as { email: string };
      return {
        _id: { toString: () => "user_test_123" },
        email: data.email,
        name: undefined,
        isPremium: false,
        createdAt: new Date()
      };
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: "mekonnenkenenisa2@gmail.com",
        password: "kenenisa11King@"
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(typeof response.body.data.token, "string");
    assert.equal(response.body.data.user.email, "mekonnenkenenisa2@gmail.com");

    // Regression guard: Express 5 getter-only query should never be reassigned.
    assert.notEqual(
      response.body.error?.message,
      "Cannot set property query of #<IncomingMessage> which has only a getter"
    );
  });

  it("returns validation error for malformed signup payload", async () => {
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: "invalid-email",
        password: "short"
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_INPUT");
  });

  it("migrates guest usage during signup when x-guest-id is provided", async () => {
    let capturedFilter: unknown;
    let capturedUpdate: unknown;

    usageModel.updateMany = (filter: unknown, update: unknown) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { exec: async () => ({ modifiedCount: 2 }) };
    };

    userModel.findOne = () => ({ exec: async () => null });
    userModel.create = async (input: unknown) => {
      const data = input as { email: string };
      return {
        _id: { toString: () => "user_test_456" },
        email: data.email,
        name: undefined,
        isPremium: false,
        createdAt: new Date()
      };
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/auth/signup")
      .set("x-guest-id", "guest_migrate_001")
      .send({
        email: "migrate@example.com",
        password: "StrongPass123!"
      });

    assert.equal(response.status, 201);
    assert.deepEqual(capturedFilter, {
      actorId: "guest_migrate_001",
      actorType: "guest"
    });
    assert.deepEqual(capturedUpdate, {
      $set: {
        actorId: "user_test_456",
        actorType: "user"
      }
    });
  });

  it("keeps signup successful if guest migration fails", async () => {
    usageModel.updateMany = () => ({
      exec: async () => {
        throw new Error("db transient error");
      }
    });

    userModel.findOne = () => ({ exec: async () => null });
    userModel.create = async (input: unknown) => {
      const data = input as { email: string };
      return {
        _id: { toString: () => "user_test_789" },
        email: data.email,
        name: undefined,
        isPremium: false,
        createdAt: new Date()
      };
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/auth/signup")
      .set("x-guest-id", "guest_migrate_fail_001")
      .send({
        email: "migrate-fail@example.com",
        password: "StrongPass123!"
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.email, "migrate-fail@example.com");
  });
});
