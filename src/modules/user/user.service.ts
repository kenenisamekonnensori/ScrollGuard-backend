import { AppError } from "../../middlewares/error-handler";
import { UserModel } from "./user.model";
import type { UpdateProfileInput } from "./user.validation";

interface UserProfileDto {
  id: string;
  email: string;
  name?: string;
  preferences: Record<string, unknown>;
  subscription: {
    isPremium: boolean;
    status: "active" | "none";
  };
  createdAt: Date;
}

function mapProfile(user: {
  _id: { toString(): string };
  email: string;
  name?: string | null;
  preferences?: Record<string, unknown> | null;
  isPremium: boolean;
  createdAt: Date;
}): UserProfileDto {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? undefined,
    preferences: user.preferences ?? {},
    // Phase 4 subscription linkage is derived from the current user flag.
    subscription: {
      isPremium: user.isPremium,
      status: user.isPremium ? "active" : "none"
    },
    createdAt: user.createdAt
  };
}

export async function getProfile(userId: string): Promise<UserProfileDto> {
  const user = await UserModel.findById(userId).exec();

  if (!user) {
    throw new AppError("User not found", 404, true, "USER_NOT_FOUND");
  }

  return mapProfile(user);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<UserProfileDto> {
  const user = await UserModel.findById(userId).exec();

  if (!user) {
    throw new AppError("User not found", 404, true, "USER_NOT_FOUND");
  }

  if (input.name !== undefined) {
    user.name = input.name;
  }

  if (input.preferences !== undefined) {
    // Merge keeps existing keys while allowing partial preference updates.
    user.preferences = {
      ...(user.preferences ?? {}),
      ...input.preferences
    };
  }

  await user.save();

  return mapProfile(user);
}
