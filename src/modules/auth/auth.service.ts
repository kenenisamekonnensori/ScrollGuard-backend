import { compare, hash } from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { SignJWT } from "jose";

import { env } from "../../config/env";
import { AppError } from "../../middlewares/error-handler";
import { UsageModel } from "../usage/usage.model";
import { UserModel } from "../user/user.model";

const jwtSecretKey = new TextEncoder().encode(env.JWT_SECRET);
const googleClient = new OAuth2Client();

interface PublicUser {
  id: string;
  email: string;
  name?: string;
  isPremium: boolean;
  createdAt: Date;
}

interface AuthResult {
  token: string;
  user: PublicUser;
}

interface EmailPasswordInput {
  email: string;
  password: string;
}

interface GoogleAuthInput {
  idToken: string;
}

interface UpgradeGuestInput extends EmailPasswordInput {
  guestId: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: {
  _id: { toString(): string };
  email: string;
  name?: string | null;
  isPremium: boolean;
  createdAt: Date;
}): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? undefined,
    isPremium: user.isPremium,
    createdAt: user.createdAt
  };
}

async function signToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(jwtSecretKey);
}

export async function signup(
  input: EmailPasswordInput,
  context?: { guestId?: string }
): Promise<AuthResult> {
  try {
    const email = normalizeEmail(input.email);
    const existingUser = await UserModel.findOne({ email }).exec();

    if (existingUser) {
      throw new AppError("User already exists", 409, true, "INVALID_INPUT");
    }

    const passwordHash = await hash(input.password, 12);
    const user = await UserModel.create({ email, passwordHash });

    if (context?.guestId) {
      await migrateGuestDataToUser(context.guestId, user._id.toString());
    }

    const token = await signToken(user._id.toString());

    return {
      token,
      user: toPublicUser(user)
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    // Mongo duplicate key fallback
    if (error.code === 11000) {
      throw new AppError("User already exists", 409, true, "INVALID_INPUT");
    }

    throw new AppError("Failed to create user", 500, true, "INTERNAL_ERROR");
  }
}

export async function login(
  input: EmailPasswordInput,
  context?: { guestId?: string }
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await UserModel.findOne({ email }).exec();

  if (!user?.passwordHash) {
    throw new AppError("Invalid credentials", 401, true, "INVALID_CREDENTIALS");
  }

  const isPasswordValid = await compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401, true, "INVALID_CREDENTIALS");
  }

  if (context?.guestId) {
    await migrateGuestDataToUser(context.guestId, user._id.toString());
  }

  const token = await signToken(user._id.toString());

  return {
    token,
    user: toPublicUser(user)
  };
}

export async function googleAuth(input: GoogleAuthInput): Promise<AuthResult> {
  if (env.GOOGLE_CLIENT_IDS.length === 0) {
    throw new AppError("Google auth is not configured", 500, true, "INTERNAL_ERROR");
  }

  let payload: { sub?: string; email?: string; email_verified?: boolean };

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: env.GOOGLE_CLIENT_IDS
    });
    payload = ticket.getPayload() ?? {};
  } catch {
    throw new AppError("Invalid Google token", 401, true, "INVALID_CREDENTIALS");
  }

  if (!payload.sub || !payload.email) {
    throw new AppError("Invalid Google token payload", 401, true, "INVALID_CREDENTIALS");
  }

  if (payload.email_verified === false) {
    throw new AppError("Google email is not verified", 401, true, "INVALID_CREDENTIALS");
  }

  const googleId = payload.sub;
  const email = normalizeEmail(payload.email);

  let user =
    (await UserModel.findOne({ googleId }).exec()) ||
    (await UserModel.findOne({ email }).exec());

  if (!user) {
    user = await UserModel.create({
      email,
      googleId
    });
  } else if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  const token = await signToken(user._id.toString());

  return {
    token,
    user: toPublicUser(user)
  };
}

async function migrateGuestDataToUser(guestId: string, userId: string): Promise<void> {
  const normalizedGuestId = guestId.trim();

  // Missing/blank guest identifiers are treated as no-op by design.
  if (normalizedGuestId.length === 0) {
    return;
  }

  // Update both ownership fields together so actor identity remains consistent.
  await UsageModel.updateMany(
    {
      actorId: normalizedGuestId,
      actorType: "guest"
    },
    {
      $set: {
        actorId: userId,
        actorType: "user"
      }
    }
  ).exec();
}

export async function upgradeGuest(input: UpgradeGuestInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const existingUser = await UserModel.findOne({ email }).exec();

  if (existingUser) {
    throw new AppError("User already exists", 409, true, "INVALID_INPUT");
  }

  const passwordHash = await hash(input.password, 12);
  const user = await UserModel.create({ email, passwordHash });

  await migrateGuestDataToUser(input.guestId, user._id.toString());

  const token = await signToken(user._id.toString());

  return {
    token,
    user: toPublicUser(user)
  };
}
