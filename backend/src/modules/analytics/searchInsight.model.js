import mongoose from "mongoose";

import {
  CURRENCY_VALUES,
  PROPERTY_TYPE_VALUES,
  TRANSACTION_TYPE_VALUES,
} from "../properties/property.constants.js";

const { Schema } = mongoose;

const searchInsightSchema = new Schema(
  {
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
    propertyType: {
      type: String,
      enum: PROPERTY_TYPE_VALUES,
      default: null,
    },
    transactionType: {
      type: String,
      enum: TRANSACTION_TYPE_VALUES,
      default: null,
    },
    currency: {
      type: String,
      enum: CURRENCY_VALUES,
      default: null,
    },
    minPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    maxPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    filters: {
      type: [String],
      default: [],
    },
    resultCount: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    strict: true,
  },
);

searchInsightSchema.index({ createdAt: -1 });
searchInsightSchema.index({ province: 1, district: 1, city: 1, area: 1, createdAt: -1 });
searchInsightSchema.index({ propertyType: 1, transactionType: 1, createdAt: -1 });
searchInsightSchema.index({ resultCount: 1, createdAt: -1 });

export const SearchInsight =
  mongoose.models.SearchInsight ||
  mongoose.model("SearchInsight", searchInsightSchema);
