import { model, Schema, Types } from "mongoose";

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    plan: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true
    },
    status: {
      type: String,
      enum: ["active", "canceled", "expired"],
      required: true,
      default: "active",
      index: true
    },
    currentPeriodStart: {
      type: Date,
      required: true
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
      index: true
    },
    provider: {
      type: String,
      required: true,
      default: "mock"
    },
    providerSubscriptionId: {
      type: String,
      required: false,
      trim: true
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

// This index speeds up lookup for active subscriptions per user.
subscriptionSchema.index({ userId: 1, status: 1, currentPeriodEnd: -1 });

export const SubscriptionModel = model("Subscription", subscriptionSchema);
