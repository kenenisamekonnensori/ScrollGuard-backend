import { compare, hash } from "bcryptjs";
import { SignJWT } from "jose";

import { env } from "../../config/env";
import { AppError } from "../../middlewares/error-handler";
import { UserModel } from "../user/user.model";

const jwtSecretKey = new TextEncoder().encode(env.JWT_SECRET);

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
  googleId: string;
  email: string;
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

export async function signup(input: EmailPasswordInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const existingUser = await UserModel.findOne({ email }).exec();

  if (existingUser) {
    throw new AppError("User already exists", 409, true, "INVALID_INPUT");
  }

  const passwordHash = await hash(input.password, 12);
  const user = await UserModel.create({ email, passwordHash });
  const token = await signToken(user._id.toString());

  return {
    token,
    user: toPublicUser(user)
  };
}

export async function login(input: EmailPasswordInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await UserModel.findOne({ email }).exec();

  if (!user?.passwordHash) {
    throw new AppError("Invalid credentials", 401, true, "INVALID_CREDENTIALS");
  }

  const isPasswordValid = await compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401, true, "INVALID_CREDENTIALS");
  }

  const token = await signToken(user._id.toString());

  return {
    token,
    user: toPublicUser(user)
  };
}

export async function googleAuth(input: GoogleAuthInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);

  let user =
    (await UserModel.findOne({ googleId: input.googleId }).exec()) ||
    (await UserModel.findOne({ email }).exec());

  if (!user) {
    user = await UserModel.create({
      email,
      googleId: input.googleId
    });
  } else if (!user.googleId) {
    user.googleId = input.googleId;
    await user.save();
  }

  const token = await signToken(user._id.toString());

  return {
    token,
    user: toPublicUser(user)
  };
}

async function migrateGuestDataToUser(_guestId: string, _userId: string): Promise<void> {
  // Usage/feature/subscription transfer is implemented in Phase 9.
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
