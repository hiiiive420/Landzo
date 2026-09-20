import mongoose from "mongoose";

import { createLocationSlug, normalizeLocationName } from "./location.utils.js";
import {
  LOCATION_LEVEL_VALUES,
  LOCATION_STATUS_VALUES,
  LOCATION_STATUSES,
} from "./location.constants.js";

const mapLocationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coordinates) =>
          Array.isArray(coordinates) &&
          coordinates.length === 2 &&
          Number.isFinite(coordinates[0]) &&
          Number.isFinite(coordinates[1]),
        message: "Map coordinates must contain longitude and latitude",
      },
    },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    level: {
      type: String,
      enum: LOCATION_LEVEL_VALUES,
      required: true,
      immutable: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    canonicalKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      select: false,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: LOCATION_STATUS_VALUES,
      required: true,
      default: LOCATION_STATUSES.ACTIVE,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
      max: 100000,
    },
    mapLocation: {
      type: mapLocationSchema,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
  },
  { timestamps: true },
);

locationSchema.index({ level: 1, parent: 1, canonicalKey: 1 }, { unique: true });
locationSchema.index({ level: 1, parent: 1, status: 1, sortOrder: 1, name: 1 });
locationSchema.index({ status: 1 });
locationSchema.index({ sortOrder: 1, name: 1 });
locationSchema.index({ mapLocation: "2dsphere" });

locationSchema.pre("validate", function setGeneratedFields() {
  if (this.isModified("name") || !this.canonicalKey || !this.slug) {
    this.canonicalKey = normalizeLocationName(this.name);
    this.slug = createLocationSlug(this.name);
  }

  if (this.parent === undefined) {
    this.parent = null;
  }
});

export const Location = mongoose.models.Location || mongoose.model("Location", locationSchema);



