import mongoose from "mongoose";

import { STAFF_ROLES, STAFF_STATUSES } from "../auth/auth.constants.js";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      maxlength: 30,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(STAFF_ROLES),
      required: true,
      default: STAFF_ROLES.ADMIN,
    },
    status: {
      type: String,
      enum: Object.values(STAFF_STATUSES),
      required: true,
      default: STAFF_STATUSES.ACTIVE,
      index: true,
    },
    profileImage: {
      type: String,
      default: null,
      trim: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    loginLockedUntil: {
      type: Date,
      default: null,
      select: false,
    },
    lastPasswordChangeAt: {
      type: Date,
      default: null,
      select: false,
    },
    authVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.failedLoginAttempts;
        delete ret.loginLockedUntil;
        delete ret.lastPasswordChangeAt;
        delete ret.authVersion;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
