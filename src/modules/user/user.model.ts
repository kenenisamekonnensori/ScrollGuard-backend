import { model, Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: false
    },
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true
    },
    name: {
      type: String,
      required: false,
      trim: true
    },
    preferences: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isPremium: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel = model("User", userSchema);
