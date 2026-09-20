import mongoose from "mongoose";

import { STAFF_ROLES } from "../auth/auth.constants.js";
import { PERMISSION_VALUES } from "./permission.constants.js";
import { SYSTEM_ROLE_KEYS } from "./role.constants.js";

const roleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: SYSTEM_ROLE_KEYS,
      required: true,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    permissions: {
      type: [String],
      default: [],
      validate: [
        {
          validator(permissions) {
            return permissions.every((permission) => PERMISSION_VALUES.includes(permission));
          },
          message: "Role contains an unknown permission",
        },
        {
          validator(permissions) {
            return new Set(permissions).size === permissions.length;
          },
          message: "Role permissions must be unique",
        },
      ],
    },
    isSystem: {
      type: Boolean,
      default: true,
      immutable: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

roleSchema.index({ key: 1 }, { unique: true });

roleSchema.pre("save", function enforceOwnerPermissions() {
  if (this.key === STAFF_ROLES.OWNER) {
    this.permissions = [...PERMISSION_VALUES];
  }
});

export const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);
