import { AppError } from "../errors/AppError.js";

const blockedKeys = new Set(["__proto__", "prototype", "constructor"]);
const maxDepth = 20;
const maxKeys = 1000;

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]" &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const isDangerousKey = (key) =>
  key.startsWith("$") || key.includes(".") || blockedKeys.has(key.toLowerCase());

const inspectValue = (value, state) => {
  if (value === null || typeof value !== "object") {
    return;
  }

  if (state.depth > maxDepth) {
    throw new AppError(400, "Invalid request structure", "INVALID_REQUEST_STRUCTURE");
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      inspectValue(item, { ...state, depth: state.depth + 1 });
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    state.keys += 1;

    if (state.keys > maxKeys || isDangerousKey(key)) {
      throw new AppError(400, "Invalid request structure", "INVALID_REQUEST_STRUCTURE");
    }

    inspectValue(value[key], { ...state, depth: state.depth + 1 });
  }
};

export const rejectDangerousKeys = (req, _res, next) => {
  try {
    inspectValue(req.body, { depth: 0, keys: 0 });
    inspectValue(req.query, { depth: 0, keys: 0 });
    inspectValue(req.params, { depth: 0, keys: 0 });
    next();
  } catch (error) {
    next(error);
  }
};
