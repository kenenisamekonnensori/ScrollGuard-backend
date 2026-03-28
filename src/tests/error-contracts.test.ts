import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import request from "supertest";

import { UsageModel } from "@/modules/usage/usage.model.js";

type UsageModelLike = {
  create: (input: unknown) => Promise<unknown>;
};

const usageModel = UsageModel as unknown as UsageModelLike;
const originalCreate = usageModel.create;

afterEach(() => {
  usageModel.create = originalCreate;
});

describe("Global API Response Contracts", () => {
  it("returns canonical success envelope for health endpoint", async () => {
    const { app } = await import("@/app.js");

    const response = await request(app).get("/api/v1/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(typeof response.body.data, "object");
    assert.deepEqual(response.body.meta, {});
  });

  it("returns NOT_FOUND for unknown routes in canonical error envelope", async () => {
    const { app } = await import("@/app.js");

    const response = await request(app).get("/api/v1/unknown-route");

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "NOT_FOUND");
    assert.equal(typeof response.body.error.message, "string");
  });

  it("hides unexpected internal error details from API responses", async () => {
    usageModel.create = async () => {
      throw new Error("database exploded");
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/usage/track")
      .set("x-guest-id", "guest_internal_001")
      .send({
        sessionDuration: 42,
        scrollCount: 12
      });

    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INTERNAL_ERROR");
    assert.equal(response.body.error.message, "An unexpected error occurred");
    assert.notEqual(response.body.error.message, "database exploded");
  });
});
