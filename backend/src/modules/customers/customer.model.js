import mongoose from "mongoose";

import {
  CUSTOMER_STATUS_VALUES,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPE_VALUES,
  CUSTOMER_TYPES,
} from "./customer.constants.js";

const { Schema } = mongoose;

const customerSchema = new Schema(
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
    type: {
      type: String,
      enum: CUSTOMER_TYPE_VALUES,
      required: true,
      default: CUSTOMER_TYPES.LEAD,
    },
    status: {
      type: String,
      enum: CUSTOMER_STATUS_VALUES,
      required: true,
      default: CUSTOMER_STATUSES.ACTIVE,
    },
    sourceEnquiry: {
      type: Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
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

customerSchema.index({ status: 1, updatedAt: -1 });
customerSchema.index({ type: 1, status: 1, updatedAt: -1 });
customerSchema.index({ assignedTo: 1, status: 1, updatedAt: -1 });
customerSchema.index({ sourceEnquiry: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });

export const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);