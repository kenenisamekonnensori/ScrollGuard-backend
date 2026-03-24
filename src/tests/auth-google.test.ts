import assert from "node:assert/strict";
import { describe, it } from "node:test";

import request from "supertest";

describe("Auth Google Endpoint", () => {
  it("rejects old payload shape without idToken", async () => {
    const { app } = await import("@/app.js");

    const response = await request(app).post("/api/v1/auth/google").send({
      googleId: "attacker-controlled",
      email: "victim@example.com"
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_INPUT");
  });
});
