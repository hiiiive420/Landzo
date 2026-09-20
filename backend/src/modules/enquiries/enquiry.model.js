import mongoose from "mongoose";

import {
  ENQUIRY_SOURCES,
  ENQUIRY_SOURCE_VALUES,
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_VALUES,
} from "./enquiry.constants.js";

const { Schema } = mongoose;

const enquirySchema = new Schema(
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
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: null,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },

    source: {
      type: String,
      enum: ENQUIRY_SOURCE_VALUES,
      default: ENQUIRY_SOURCES.WEBSITE,
      required: true,
    },

    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      default: null,
    },

    status: {
      type: String,
      enum: ENQUIRY_STATUS_VALUES,
      default: ENQUIRY_STATUSES.NEW,
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    internalNote: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    closedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

enquirySchema.index({
  status: 1,
  createdAt: -1,
});

enquirySchema.index({
  assignedTo: 1,
  status: 1,
  createdAt: -1,
});

enquirySchema.index({
  property: 1,
  createdAt: -1,
});

enquirySchema.index({
  source: 1,
  createdAt: -1,
});

export const Enquiry =
  mongoose.models.Enquiry ||
  mongoose.model("Enquiry", enquirySchema);