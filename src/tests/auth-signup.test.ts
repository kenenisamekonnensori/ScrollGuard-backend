import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { UserModel } from "../modules/user/user.model";

type FindOneResult = { exec: () => Promise<unknown> };

type UserModelLike = {
  findOne: (filter: unknown) => FindOneResult;
  create: (input: unknown) => Promise<unknown>;
};

const userModel = UserModel as unknown as UserModelLike;
const originalFindOne = userModel.findOne;
const originalCreate = userModel.create;

function restoreUserModel(): void {
  userModel.findOne = originalFindOne;
  userModel.create = originalCreate;
}

afterEach(() => {
  restoreUserModel();
});

describe("Auth Signup Endpoint", () => {
  it("returns 201 and does not crash on query assignment", async () => {
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

    const { app } = await import("../app");

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
    const { app } = await import("../app");

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
});
