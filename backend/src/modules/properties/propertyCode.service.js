import { AppError } from "../../common/errors/AppError.js";
import { PROPERTY_CODE_PREFIXES, PROPERTY_TYPE_VALUES } from "./property.constants.js";
import { PropertyCodeCounter } from "./propertyCode.model.js";
import { formatPropertyCode } from "./property.utils.js";

const sequenceKeyForType = (type) => `property-code:${type}`;

export const generatePropertyCode = async (type) => {
  if (!PROPERTY_TYPE_VALUES.includes(type)) {
    throw new AppError(400, "Invalid property type", "INVALID_PROPERTY_TYPE");
  }

  const counter = await PropertyCodeCounter.findOneAndUpdate(
    { key: sequenceKeyForType(type) },
    { $inc: { sequence: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );

  if (!counter?.sequence) {
    throw new AppError(500, "Property code generation failed", "PROPERTY_CODE_GENERATION_FAILED");
  }

  return formatPropertyCode({ prefix: PROPERTY_CODE_PREFIXES[type], sequence: counter.sequence });
};
