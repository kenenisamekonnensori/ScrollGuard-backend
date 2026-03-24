import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { hash } from "bcryptjs";
import request from "supertest";

import { UserModel } from "@/modules/user/user.model.js";
import { UsageModel } from "@/modules/usage/usage.model.js";

type FindOneResult = { exec: () => Promise<unknown> };

type UserModelLike = {
  findOne: (filter: unknown) => FindOneResult;
};

type UsageModelLike = {
  updateMany: (filter: unknown, update: unknown) => { exec: () => Promise<unknown> };
};

const userModel = UserModel as unknown as UserModelLike;
const usageModel = UsageModel as unknown as UsageModelLike;

const originalFindOne = userModel.findOne;
const originalUsageUpdateMany = usageModel.updateMany;

function restoreModels(): void {
  userModel.findOne = originalFindOne;
  usageModel.updateMany = originalUsageUpdateMany;
}

afterEach(() => {
  restoreModels();
});

describe("Auth Login Endpoint", () => {
  it("migrates guest usage on successful login when x-guest-id is provided", async () => {
    const passwordHash = await hash("StrongPass123!", 12);
    let capturedFilter: unknown;
    let capturedUpdate: unknown;

    userModel.findOne = () => ({
      exec: async () => ({
        _id: { toString: () => "user_login_001" },
        email: "login@example.com",
        passwordHash,
        name: undefined,
        isPremium: false,
        createdAt: new Date()
      })
    });

    usageModel.updateMany = (filter: unknown, update: unknown) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { exec: async () => ({ modifiedCount: 1 }) };
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("x-guest-id", "guest_login_001")
      .send({
        email: "login@example.com",
        password: "StrongPass123!"
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(typeof response.body.data.token, "string");
    assert.deepEqual(capturedFilter, {
      actorId: "guest_login_001",
      actorType: "guest"
    });
    assert.deepEqual(capturedUpdate, {
      $set: {
        actorId: "user_login_001",
        actorType: "user"
      }
    });
  });

  it("does not migrate when guest header is absent", async () => {
    const passwordHash = await hash("StrongPass123!", 12);
    let migrationCalled = false;

    userModel.findOne = () => ({
      exec: async () => ({
        _id: { toString: () => "user_login_002" },
        email: "noguest@example.com",
        passwordHash,
        name: undefined,
        isPremium: false,
        createdAt: new Date()
      })
    });

    usageModel.updateMany = () => {
      migrationCalled = true;
      return { exec: async () => ({ modifiedCount: 0 }) };
    };

    const { app } = await import("@/app.js");

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "noguest@example.com",
      password: "StrongPass123!"
    });

    assert.equal(response.status, 200);
    assert.equal(migrationCalled, false);
  });

  it("keeps invalid-credential behavior unchanged", async () => {
    usageModel.updateMany = () => {
      throw new Error("Migration should not run on invalid login");
    };

    userModel.findOne = () => ({ exec: async () => null });

    const { app } = await import("@/app.js");

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "missing@example.com",
      password: "StrongPass123!"
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_CREDENTIALS");
  });
});
