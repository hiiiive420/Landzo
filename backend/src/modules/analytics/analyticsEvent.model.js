import mongoose from "mongoose";

import {
  ANALYTICS_CONTEXT_SURFACE_VALUES,
  ANALYTICS_EVENT_TYPE_VALUES,
} from "./analytics.constants.js";

const { Schema } = mongoose;

const analyticsContextSchema = new Schema(
  {
    surface: {
      type: String,
      enum: ANALYTICS_CONTEXT_SURFACE_VALUES,
      default: null,
    },
  },
  { _id: false, strict: true },
);

const analyticsEventSchema = new Schema(
  {
    eventType: {
      type: String,
      enum: ANALYTICS_EVENT_TYPE_VALUES,
      required: true,
      immutable: true,
    },

    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      default: null,
      immutable: true,
    },

    context: {
      type: analyticsContextSchema,
      default: undefined,
      immutable: true,
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

analyticsEventSchema.index({ createdAt: -1, eventType: 1 });
analyticsEventSchema.index({ eventType: 1, createdAt: -1, property: 1 });

export const AnalyticsEvent =
  mongoose.models.AnalyticsEvent ||
  mongoose.model("AnalyticsEvent", analyticsEventSchema);
