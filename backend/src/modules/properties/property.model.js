import mongoose from "mongoose";

import {
  BUILDING_SIZE_UNIT_VALUES,
  COMMERCIAL_TYPE_VALUES,
  CURRENCY_VALUES,
  FURNISHED_STATUS_VALUES,
  LAND_SIZE_UNIT_VALUES,
  LAND_TYPE_VALUES,
  LAND_UTILITY_VALUES,
  LEASE_PERIOD_VALUES,
  PRICE_MODE_VALUES,
  PROPERTY_DETAIL_KEYS,
  PROPERTY_STATUSES,
  PROPERTY_STATUS_VALUES,
  PROPERTY_TYPE_VALUES,
  RENT_PERIOD_VALUES,
  TRANSACTION_TYPE_VALUES,
} from "./property.constants.js";
import { createPropertySlug, normalizePropertyCode } from "./property.utils.js";

const { Schema } = mongoose;

const positiveMeasurement = { type: Number, min: Number.MIN_VALUE };
const nonNegativeInteger = { type: Number, min: 0 };
const positiveSafeIntegerAmount = {
  type: Number,
  default: undefined,
  validate: {
    validator(value) {
      return value === undefined || value === null || (Number.isSafeInteger(value) && value > 0);
    },
    message: "Price amount must be a positive safe integer",
  },
};

const landDetailsSchema = new Schema(
  {
    landSize: positiveMeasurement,
    landSizeUnit: { type: String, enum: LAND_SIZE_UNIT_VALUES },
    landType: { type: String, enum: LAND_TYPE_VALUES },
    roadAccess: { type: Boolean },
    roadWidth: positiveMeasurement,
    utilities: {
      type: [String],
      default: undefined,
      enum: LAND_UTILITY_VALUES,
      validate: {
        validator(utilities) {
          return !utilities || new Set(utilities).size === utilities.length;
        },
        message: "Land utilities must be unique",
      },
    },
  },
  { _id: false, strict: true },
);

const houseDetailsSchema = new Schema(
  {
    bedrooms: nonNegativeInteger,
    bathrooms: nonNegativeInteger,
    floors: nonNegativeInteger,
    landSize: positiveMeasurement,
    landSizeUnit: { type: String, enum: LAND_SIZE_UNIT_VALUES },
    houseSize: positiveMeasurement,
    houseSizeUnit: { type: String, enum: BUILDING_SIZE_UNIT_VALUES },
    parkingSpaces: nonNegativeInteger,
    furnishedStatus: { type: String, enum: FURNISHED_STATUS_VALUES },
  },
  { _id: false, strict: true },
);

const apartmentDetailsSchema = new Schema(
  {
    bedrooms: nonNegativeInteger,
    bathrooms: nonNegativeInteger,
    floorNumber: nonNegativeInteger,
    totalFloors: nonNegativeInteger,
    unitSize: positiveMeasurement,
    unitSizeUnit: { type: String, enum: BUILDING_SIZE_UNIT_VALUES },
    parkingSpaces: nonNegativeInteger,
    furnishedStatus: { type: String, enum: FURNISHED_STATUS_VALUES },
  },
  { _id: false, strict: true },
);

const commercialDetailsSchema = new Schema(
  {
    commercialType: { type: String, enum: COMMERCIAL_TYPE_VALUES },
    floorArea: positiveMeasurement,
    floorAreaUnit: { type: String, enum: BUILDING_SIZE_UNIT_VALUES },
    floorNumber: nonNegativeInteger,
    parkingSpaces: nonNegativeInteger,
  },
  { _id: false, strict: true },
);

const salePricingSchema = new Schema(
  {
    mode: { type: String, enum: PRICE_MODE_VALUES, required: true },
    amount: positiveSafeIntegerAmount,
  },
  { _id: false, strict: true },
);

const recurringPricingSchema = (periodValues) =>
  new Schema(
    {
      mode: { type: String, enum: PRICE_MODE_VALUES, required: true },
      period: { type: String, enum: periodValues, required: true },
      amount: positiveSafeIntegerAmount,
    },
    { _id: false, strict: true },
  );

const pricingSchema = new Schema(
  {
    currency: { type: String, enum: CURRENCY_VALUES, required: true },
    priceVisible: { type: Boolean, default: false },
    sale: { type: salePricingSchema, default: undefined },
    rent: { type: recurringPricingSchema(RENT_PERIOD_VALUES), default: undefined },
    lease: { type: recurringPricingSchema(LEASE_PERIOD_VALUES), default: undefined },
  },
  { _id: false, strict: true },
);

const propertyImageSchema = new Schema(
  {
    publicId: { type: String, required: true, trim: true },
    secureUrl: { type: String, required: true, trim: true },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    format: { type: String, required: true, trim: true, lowercase: true },
    bytes: { type: Number, required: true, min: 1 },
    order: { type: Number, required: true, min: 0 },
    isCover: { type: Boolean, required: true, default: false },
    uploadedAt: { type: Date, required: true, default: Date.now },
    originalFilename: { type: String, trim: true, maxlength: 180, default: null },
  },
  { strict: true },
);

const mediaSchema = new Schema(
  {
    images: { type: [propertyImageSchema], default: [] },
  },
  { _id: false, strict: true },
);
const geoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(coordinates) {
          if (!Array.isArray(coordinates) || coordinates.length !== 2) {
            return false;
          }

          const [longitude, latitude] = coordinates;
          return (
            Number.isFinite(longitude) &&
            Number.isFinite(latitude) &&
            longitude >= -180 &&
            longitude <= 180 &&
            latitude >= -90 &&
            latitude <= 90
          );
        },
        message: "Map location must be a valid GeoJSON Point",
      },
    },
  },
  { _id: false, strict: true },
);

const hasMeaningfulDetails = (value) => {
  if (!value) {
    return false;
  }

  const plainValue = typeof value.toObject === "function" ? value.toObject() : value;
  return Object.values(plainValue).some((item) => item !== undefined && item !== null);
};

const propertySchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      immutable: true,
    },
    type: {
      type: String,
      enum: PROPERTY_TYPE_VALUES,
      required: true,
      immutable: true,
    },
    transactionTypes: {
      type: [String],
      required: true,
      enum: TRANSACTION_TYPE_VALUES,
      validate: [
        {
          validator(transactionTypes) {
            return Array.isArray(transactionTypes) && transactionTypes.length > 0;
          },
          message: "At least one transaction type is required",
        },
        {
          validator(transactionTypes) {
            return new Set(transactionTypes).size === transactionTypes.length;
          },
          message: "Transaction types must be unique",
        },
      ],
    },
    status: {
      type: String,
      enum: PROPERTY_STATUS_VALUES,
      required: true,
      default: PROPERTY_STATUSES.DRAFT,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 180,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },
    province: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    district: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    area: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    displayAddress: {
      type: String,
      trim: true,
      maxlength: 240,
      default: null,
    },
    pricing: {
      type: pricingSchema,
      default: undefined,
    },
    mapLocation: {
      type: geoPointSchema,
      default: undefined,
    },
    media: {
      type: mediaSchema,
      default: () => ({ images: [] }),
    },
    details: {
      land: { type: landDetailsSchema, default: undefined },
      house: { type: houseDetailsSchema, default: undefined },
      apartment: { type: apartmentDetailsSchema, default: undefined },
      commercial: { type: commercialDetailsSchema, default: undefined },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    exploreMapEnabled: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    purgeAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
  },
  { timestamps: true },
);

propertySchema.index({ code: 1 }, { unique: true });
propertySchema.index({ type: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ transactionTypes: 1 });
propertySchema.index({ isPublic: 1 });
propertySchema.index({ exploreMapEnabled: 1 });
propertySchema.index({ featured: 1 });
propertySchema.index({ deletedAt: 1 });
propertySchema.index({ purgeAt: 1 });
propertySchema.index({ province: 1, district: 1, city: 1, area: 1 });
propertySchema.index({ mapLocation: "2dsphere" });
propertySchema.index({ "media.images.isCover": 1 });
propertySchema.index({ createdAt: -1 });

propertySchema.pre("validate", function prepareProperty() {
  if (this.isModified("code")) {
    this.code = normalizePropertyCode(this.code);
  }

  if (this.isModified("title") || !this.slug) {
    this.slug = createPropertySlug(this.title);
  }

  const allowedDetailKey = PROPERTY_DETAIL_KEYS[this.type];

  for (const detailKey of Object.values(PROPERTY_DETAIL_KEYS)) {
    if (detailKey !== allowedDetailKey && hasMeaningfulDetails(this.details?.[detailKey])) {
      this.invalidate(
        "details",
        `Only ${allowedDetailKey} details are allowed for ${this.type} properties`,
      );
    }
  }
});

export const Property = mongoose.models.Property || mongoose.model("Property", propertySchema);

