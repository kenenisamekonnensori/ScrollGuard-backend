import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { SignJWT } from "jose";
import request from "supertest";

import { env } from "../config/env";
import { hasAccess } from "../modules/feature/feature.service";
import { UserModel } from "../modules/user/user.model";

type FindByIdResult = { select: (fields: string) => { exec: () => Promise<unknown> } };

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

describe("Feature Access Endpoint", () => {
  it("returns guest-accessible features for guest actor", async () => {
    const { app } = await import("../app");

    const response = await request(app).get("/api/v1/features");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const features = response.body.data.features as Array<{
      key: string;
      enabled: boolean;
    }>;

    const basic = features.find((item) => item.key === "BASIC_TRACKING");
    const saved = features.find((item) => item.key === "SAVED_HISTORY");
    const advanced = features.find((item) => item.key === "ADVANCED_ANALYTICS");
    const ai = features.find((item) => item.key === "AI_INSIGHTS");

    assert.equal(basic?.enabled, true);
    assert.equal(saved?.enabled, false);
    assert.equal(advanced?.enabled, false);
    assert.equal(ai?.enabled, false);
  });

  it("returns auth-only access for non-premium user", async () => {
    userModel.findById = () => ({
      select: () => ({
        exec: async () => ({ isPremium: false })
      })
    });

    const token = await createUserToken("user_free_001");
    const { app } = await import("../app");

    const response = await request(app)
      .get("/api/v1/features")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const features = response.body.data.features as Array<{
      key: string;
      enabled: boolean;
    }>;

    const saved = features.find((item) => item.key === "SAVED_HISTORY");
    const advanced = features.find((item) => item.key === "ADVANCED_ANALYTICS");
    const ai = features.find((item) => item.key === "AI_INSIGHTS");

    assert.equal(saved?.enabled, true);
    assert.equal(advanced?.enabled, false);
    assert.equal(ai?.enabled, false);
  });

  it("returns all features enabled for premium user", async () => {
    userModel.findById = () => ({
      select: () => ({
        exec: async () => ({ isPremium: true })
      })
    });

    const token = await createUserToken("user_premium_001");
    const { app } = await import("../app");

    const response = await request(app)
      .get("/api/v1/features")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const features = response.body.data.features as Array<{
      key: string;
      enabled: boolean;
    }>;

    for (const item of features) {
      assert.equal(item.enabled, true);
    }
  });
});

describe("Feature Service", () => {
  it("denies unknown feature keys", async () => {
    const result = await hasAccess({ type: "guest", id: "guest_001" }, "UNKNOWN_FEATURE");
    assert.equal(result, false);
  });
});
