import mongoose from "mongoose";

import { SITE_VISIT_STATUSES, SITE_VISIT_STATUS_VALUES } from "./siteVisit.constants.js";

const { Schema } = mongoose;

const siteVisitSchema = new Schema(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    enquiry: {
      type: Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },
    visitorName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    visitorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: null,
    },
    visitorPhone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: null,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: SITE_VISIT_STATUS_VALUES,
      required: true,
      default: SITE_VISIT_STATUSES.SCHEDULED,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },
    completionNote: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
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
  { timestamps: true },
);

siteVisitSchema.index({ status: 1, scheduledAt: 1 });
siteVisitSchema.index({ assignedTo: 1, scheduledAt: 1 });
siteVisitSchema.index({ property: 1, scheduledAt: 1 });
siteVisitSchema.index({ customer: 1, scheduledAt: 1 });
siteVisitSchema.index({ enquiry: 1, scheduledAt: 1 });

export const SiteVisit = mongoose.models.SiteVisit || mongoose.model("SiteVisit", siteVisitSchema);