import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SignJWT } from "jose";
import request from "supertest";

import { env } from "@/config/env.js";

async function createUserToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

describe("Guest Init Endpoint", () => {
  it("returns generated guest id when none is supplied", async () => {
    const { app } = await import("@/app.js");

    const response = await request(app).post("/api/v1/guest/init");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.type, "guest");
    assert.equal(typeof response.body.data.guestId, "string");
    assert.ok(response.body.data.guestId.length > 0);
    assert.equal(response.headers["x-guest-id"], response.body.data.guestId);
  });

  it("reuses existing guest id from header", async () => {
    const existingGuestId = "guest_existing_123";
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/guest/init")
      .set("x-guest-id", existingGuestId);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.guestId, existingGuestId);
    assert.equal(response.body.data.type, "guest");
  });

  it("forbids authenticated users from guest init", async () => {
    const token = await createUserToken("user_999");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/guest/init")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "FORBIDDEN");
  });
});
