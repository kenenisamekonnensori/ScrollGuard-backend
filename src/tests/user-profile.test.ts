import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { SignJWT } from "jose";
import request from "supertest";

import { env } from "../config/env";
import { UserModel } from "../modules/user/user.model";

type FindByIdResult = { exec: () => Promise<unknown> };

type UserDocStub = {
  _id: { toString(): string };
  email: string;
  name?: string;
  preferences?: Record<string, unknown>;
  isPremium: boolean;
  createdAt: Date;
  save: () => Promise<void>;
};

type UserModelLike = {
  findById: (id: string) => FindByIdResult;
};

const userModel = UserModel as unknown as UserModelLike;
const originalFindById = userModel.findById;

function restoreUserModel(): void {
  userModel.findById = originalFindById;
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
  restoreUserModel();
});

describe("User Profile Endpoints", () => {
  it("rejects guest actor for GET /user/profile", async () => {
    const { app } = await import("../app");

    const response = await request(app).get("/api/v1/user/profile");

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "AUTH_REQUIRED");
  });

  it("returns profile for authenticated user", async () => {
    const createdAt = new Date();

    userModel.findById = () => ({
      exec: async () => ({
        _id: { toString: () => "user_123" },
        email: "user@example.com",
        name: "Kenenisa",
        preferences: { theme: "light" },
        isPremium: true,
        createdAt,
        save: async () => {}
      } satisfies UserDocStub)
    });

    const token = await createUserToken("user_123");
    const { app } = await import("../app");

    const response = await request(app)
      .get("/api/v1/user/profile")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, "user_123");
    assert.equal(response.body.data.subscription.isPremium, true);
    assert.equal(response.body.data.subscription.status, "active");
  });

  it("patches name and merges preferences for authenticated user", async () => {
    const user: UserDocStub = {
      _id: { toString: () => "user_456" },
      email: "user2@example.com",
      name: "Old Name",
      preferences: { theme: "dark", locale: "en" },
      isPremium: false,
      createdAt: new Date(),
      save: async () => {}
    };

    userModel.findById = () => ({ exec: async () => user });

    const token = await createUserToken("user_456");
    const { app } = await import("../app");

    const response = await request(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "New Name",
        preferences: { locale: "am", notifications: true }
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.name, "New Name");
    assert.deepEqual(response.body.data.preferences, {
      theme: "dark",
      locale: "am",
      notifications: true
    });
    assert.equal(response.body.data.subscription.status, "none");
  });
});
