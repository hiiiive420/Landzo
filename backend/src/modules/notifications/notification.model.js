import mongoose from "mongoose";

import {
  NOTIFICATION_ENTITY_TYPE_VALUES,
  NOTIFICATION_LIMITS,
  NOTIFICATION_TYPE_VALUES,
} from "./notification.constants.js";

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPE_VALUES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTIFICATION_LIMITS.titleMaxLength,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTIFICATION_LIMITS.messageMaxLength,
    },
    entityType: {
      type: String,
      enum: NOTIFICATION_ENTITY_TYPE_VALUES,
      default: null,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  },
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);