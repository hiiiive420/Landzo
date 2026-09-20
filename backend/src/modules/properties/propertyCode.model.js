import mongoose from "mongoose";

const propertyCodeCounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

propertyCodeCounterSchema.index({ key: 1 }, { unique: true });

export const PropertyCodeCounter =
  mongoose.models.PropertyCodeCounter ||
  mongoose.model("PropertyCodeCounter", propertyCodeCounterSchema);
