import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import request from "supertest";

import { UserModel } from "@/modules/user/user.model.js";
import { UsageModel } from "@/modules/usage/usage.model.js";

type FindOneResult = { exec: () => Promise<unknown> };

type UserModelLike = {
  findOne: (filter: unknown) => FindOneResult;
  create: (input: unknown) => Promise<unknown>;
};

type UsageModelLike = {
  updateMany: (filter: unknown, update: unknown) => { exec: () => Promise<unknown> };
};

const userModel = UserModel as unknown as UserModelLike;
const usageModel = UsageModel as unknown as UsageModelLike;

const originalFindOne = userModel.findOne;
const originalCreate = userModel.create;
const originalUsageUpdateMany = usageModel.updateMany;

function restoreModels(): void {
  userModel.findOne = originalFindOne;
  userModel.create = originalCreate;
  usageModel.updateMany = originalUsageUpdateMany;
}

afterEach(() => {
  restoreModels();
});

describe("Auth Upgrade Guest Endpoint", () => {
  it("creates a user and migrates guest usage", async () => {
    let capturedFilter: unknown;
    let capturedUpdate: unknown;

    userModel.findOne = () => ({ exec: async () => null });
    userModel.create = async (input: unknown) => {
      const data = input as { email: string };
      return {
        _id: { toString: () => "user_upgrade_001" },
        email: data.email,
        name: undefined,
        isPremium: false,
        createdAt: new Date()
      };
    };

    usageModel.updateMany = (filter: unknown, update: unknown) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { exec: async () => ({ modifiedCount: 3 }) };
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/auth/upgrade-guest")
      .send({
        guestId: "guest_upgrade_001",
        email: "upgrade@example.com",
        password: "StrongPass123!"
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.email, "upgrade@example.com");
    assert.deepEqual(capturedFilter, {
      actorId: "guest_upgrade_001",
      actorType: "guest"
    });
    assert.deepEqual(capturedUpdate, {
      $set: {
        actorId: "user_upgrade_001",
        actorType: "user"
      }
    });
  });

  it("returns conflict when email already exists", async () => {
    userModel.findOne = () => ({
      exec: async () => ({ _id: { toString: () => "existing_user" }, email: "dup@example.com" })
    });

    let createCalled = false;
    userModel.create = async () => {
      createCalled = true;
      throw new Error("should not create");
    };

    let migrationCalled = false;
    usageModel.updateMany = () => {
      migrationCalled = true;
      return { exec: async () => ({ modifiedCount: 0 }) };
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/auth/upgrade-guest")
      .send({
        guestId: "guest_upgrade_dup",
        email: "dup@example.com",
        password: "StrongPass123!"
      });

    assert.equal(response.status, 409);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_INPUT");
    assert.equal(createCalled, false);
    assert.equal(migrationCalled, false);
  });

  it("keeps upgrade successful if usage migration fails", async () => {
    userModel.findOne = () => ({ exec: async () => null });
    userModel.create = async (input: unknown) => {
      const data = input as { email: string };
      return {
        _id: { toString: () => "user_upgrade_002" },
        email: data.email,
        name: undefined,
        isPremium: false,
        createdAt: new Date()
      };
    };

    usageModel.updateMany = () => ({
      exec: async () => {
        throw new Error("migration outage");
      }
    });

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/auth/upgrade-guest")
      .send({
        guestId: "guest_upgrade_fail",
        email: "upgrade-fail@example.com",
        password: "StrongPass123!"
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.email, "upgrade-fail@example.com");
  });
});
