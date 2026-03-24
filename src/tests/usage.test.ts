import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { SignJWT } from "jose";
import request from "supertest";

import { env } from "@/config/env.js";
import { UsageModel } from "@/modules/usage/usage.model.js";

type UsageModelLike = {
  create: (input: unknown) => Promise<unknown>;
  aggregate: (pipeline: unknown[]) => Promise<unknown[]>;
};

const usageModel = UsageModel as unknown as UsageModelLike;
const originalCreate = usageModel.create;
const originalAggregate = usageModel.aggregate;

function restoreUsageModel(): void {
  usageModel.create = originalCreate;
  usageModel.aggregate = originalAggregate;
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
  restoreUsageModel();
});

describe("Usage Module", () => {
  it("tracks usage for guest actors", async () => {
    let capturedCreate: unknown;

    usageModel.create = async (input: unknown) => {
      capturedCreate = input;
      return input;
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/usage/track")
      .set("x-guest-id", "guest_track_001")
      .send({
        sessionDuration: 120,
        scrollCount: 42
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.recorded, true);

    const created = capturedCreate as { actorId: string; actorType: string };
    assert.equal(created.actorId, "guest_track_001");
    assert.equal(created.actorType, "guest");
  });

  it("tracks usage for authenticated users", async () => {
    let capturedCreate: unknown;

    usageModel.create = async (input: unknown) => {
      capturedCreate = input;
      return input;
    };

    const token = await createUserToken("user_track_001");
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/usage/track")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sessionDuration: 300,
        scrollCount: 95
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);

    const created = capturedCreate as { actorId: string; actorType: string };
    assert.equal(created.actorId, "user_track_001");
    assert.equal(created.actorType, "user");
  });

  it("returns aggregated stats for selected range", async () => {
    usageModel.aggregate = async (pipeline: unknown[]) => {
      const hasTotalsGroup = pipeline.some((stage) => {
        const value = stage as { $group?: { _id?: unknown } };
        return value.$group?._id === null;
      });

      if (hasTotalsGroup) {
        return [
          {
            totalScrolls: 220,
            totalSessionDuration: 600,
            avgSessionDuration: 200,
            eventsCount: 3
          }
        ];
      }

      return [
        { date: "2026-03-19", scrolls: 100, sessionDuration: 240 },
        { date: "2026-03-20", scrolls: 120, sessionDuration: 360 }
      ];
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .get("/api/v1/usage/stats")
      .set("x-guest-id", "guest_stats_001")
      .query({ range: "week" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.period, "week");
    assert.equal(response.body.data.totalScrolls, 220);
    assert.equal(response.body.data.eventsCount, 3);
    assert.equal(response.body.data.history.length, 2);
  });

  it("rejects invalid tracking payload", async () => {
    const { app } = await import("@/app.js");

    const response = await request(app)
      .post("/api/v1/usage/track")
      .set("x-guest-id", "guest_invalid_001")
      .send({
        sessionDuration: -1,
        scrollCount: -4
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "INVALID_INPUT");
  });

  it("returns zeroed stats when no usage exists", async () => {
    usageModel.aggregate = async (pipeline: unknown[]) => {
      const hasTotalsGroup = pipeline.some((stage) => {
        const value = stage as { $group?: { _id?: unknown } };
        return value.$group?._id === null;
      });

      return hasTotalsGroup ? [] : [];
    };

    const { app } = await import("@/app.js");

    const response = await request(app)
      .get("/api/v1/usage/stats")
      .set("x-guest-id", "guest_empty_001")
      .query({ range: "day" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.totalScrolls, 0);
    assert.equal(response.body.data.totalSessionDuration, 0);
    assert.equal(response.body.data.eventsCount, 0);
    assert.deepEqual(response.body.data.history, []);
  });
});
