import mongoose from "mongoose";

import { CURRENCY_VALUES } from "../properties/property.constants.js";
import {
  LISTING_AGREEMENT_STATUS_VALUES,
  LISTING_AGREEMENT_STATUSES,
} from "./listingAgreement.constants.js";

const { Schema } = mongoose;

const sellerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 160 },
    identificationNumber: { type: String, required: true, trim: true, maxlength: 40 },
    address: { type: String, default: "", trim: true, maxlength: 500 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    mobilePhone: { type: String, default: "", trim: true, maxlength: 40 },
  },
  { _id: false, strict: true },
);

const optionalSellerSchema = new Schema(
  {
    fullName: { type: String, default: "", trim: true, maxlength: 160 },
    identificationNumber: { type: String, default: "", trim: true, maxlength: 40 },
    address: { type: String, default: "", trim: true, maxlength: 500 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    mobilePhone: { type: String, default: "", trim: true, maxlength: 40 },
  },
  { _id: false, strict: true },
);

const listingAgreementSchema = new Schema(
  {
    serialNumber: { type: String, required: true, trim: true, immutable: true },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      immutable: true,
    },
    propertyCode: { type: String, required: true, trim: true, immutable: true },
    propertyType: { type: String, required: true, trim: true },
    judicialZone: { type: String, default: "", trim: true, maxlength: 160 },
    deedNumber: { type: String, default: "", trim: true, maxlength: 120 },
    propertyInformation: { type: String, required: true, trim: true, maxlength: 1200 },
    propertyAddress: { type: String, required: true, trim: true, maxlength: 500 },
    seller1: { type: sellerSchema, required: true },
    seller2: { type: optionalSellerSchema, default: () => ({}) },
    agreementDate: { type: Date, required: true },
    commencementDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    exclusivePeriodDays: { type: Number, required: true, min: 1, max: 3650 },
    protectionPeriodDays: { type: Number, required: true, min: 0, max: 3650 },
    minimumSellingPrice: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER },
    currency: { type: String, enum: CURRENCY_VALUES, required: true },
    totalValuation: {
      type: Number,
      default: null,
      min: 1,
      max: Number.MAX_SAFE_INTEGER,
    },
    commissionPercentage: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      enum: LISTING_AGREEMENT_STATUS_VALUES,
      required: true,
      default: LISTING_AGREEMENT_STATUSES.GENERATED,
    },
    signedDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "PrivateDocument",
      default: null,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false, strict: true },
);

listingAgreementSchema.index({ serialNumber: 1 }, { unique: true });
listingAgreementSchema.index({ propertyId: 1, createdAt: -1 });
listingAgreementSchema.index({ status: 1, expiryDate: 1 });

export const ListingAgreement =
  mongoose.models.ListingAgreement || mongoose.model("ListingAgreement", listingAgreementSchema);

const listingAgreementCounterSchema = new Schema(
  {
    year: { type: Number, required: true, unique: true },
    sequence: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const ListingAgreementCounter =
  mongoose.models.ListingAgreementCounter ||
  mongoose.model("ListingAgreementCounter", listingAgreementCounterSchema);
