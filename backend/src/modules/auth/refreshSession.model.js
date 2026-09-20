import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    userAgent: {
      type: String,
      default: null,
      maxlength: 512,
      select: false,
    },
    requestId: {
      type: String,
      default: null,
      maxlength: 128,
      select: false,
    },
  },
  { timestamps: true },
);

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

export const RefreshSession =
  mongoose.models.RefreshSession || mongoose.model("RefreshSession", refreshSessionSchema);
