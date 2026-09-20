import mongoose from "mongoose";

import {
  PRIVATE_DOCUMENT_CATEGORIES,
  PRIVATE_DOCUMENT_CATEGORY_VALUES,
  PRIVATE_DOCUMENT_LIMITS,
  PRIVATE_DOCUMENT_STATUSES,
  PRIVATE_DOCUMENT_STATUS_VALUES,
} from "./privateDocument.constants.js";

const { Schema } = mongoose;

const storageSchema = new Schema(
  {
    publicId: {
      type: String,
      default: null,
      trim: true,
    },

    resourceType: {
      type: String,
      default: null,
      trim: true,
    },

    format: {
      type: String,
      required: true,
      trim: true,
    },

    bytes: {
      type: Number,
      required: true,
      min: 0,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    originalFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: PRIVATE_DOCUMENT_LIMITS.originalFilenameMaxLength,
    },
  },
  {
    _id: false,
  },
);

const privateDocumentSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: PRIVATE_DOCUMENT_LIMITS.titleMaxLength,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: PRIVATE_DOCUMENT_LIMITS.descriptionMaxLength,
    },

    category: {
      type: String,
      enum: PRIVATE_DOCUMENT_CATEGORY_VALUES,
      required: true,
      default: PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    storage: {
      type: storageSchema,
      required: true,
    },

    status: {
      type: String,
      enum: PRIVATE_DOCUMENT_STATUS_VALUES,
      required: true,
      default: PRIVATE_DOCUMENT_STATUSES.ACTIVE,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

privateDocumentSchema.index({
  status: 1,
  createdAt: -1,
});

privateDocumentSchema.index({
  category: 1,
  status: 1,
  createdAt: -1,
});

privateDocumentSchema.index({
  category: 1,
  entityId: 1,
  status: 1,
  createdAt: -1,
});

privateDocumentSchema.index({
  createdBy: 1,
  createdAt: -1,
});

export const PrivateDocument =
  mongoose.models.PrivateDocument ||
  mongoose.model("PrivateDocument", privateDocumentSchema);