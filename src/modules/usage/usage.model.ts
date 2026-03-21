import { model, Schema } from "mongoose";

const usageSchema = new Schema(
  {
    actorId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    actorType: {
      type: String,
      enum: ["user", "guest"],
      required: true,
      index: true
    },
    sessionDuration: {
      type: Number,
      required: true,
      min: 0
    },
    scrollCount: {
      type: Number,
      required: true,
      min: 0
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

// Fast path for actor-scoped timeline queries used by stats endpoint.
usageSchema.index({ actorId: 1, timestamp: -1 });

export const UsageModel = model("Usage", usageSchema);
