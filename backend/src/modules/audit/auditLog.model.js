import mongoose from "mongoose";

import {
  AUDIT_ACTION_VALUES,
  AUDIT_ENTITY_TYPE_VALUES,
  AUDIT_LIMITS,
} from "./audit.constants.js";

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: AUDIT_ACTION_VALUES,
      required: true,
    },

    entityType: {
      type: String,
      enum: AUDIT_ENTITY_TYPE_VALUES,
      required: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    entityLabel: {
      type: String,
      trim: true,
      maxlength:
        AUDIT_LIMITS.entityLabelMaxLength,
      default: "",
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

auditLogSchema.index({
  createdAt: -1,
});

auditLogSchema.index({
  actor: 1,
  createdAt: -1,
});

auditLogSchema.index({
  action: 1,
  createdAt: -1,
});

auditLogSchema.index({
  entityType: 1,
  createdAt: -1,
});

auditLogSchema.index({
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

export const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model(
    "AuditLog",
    auditLogSchema,
  );