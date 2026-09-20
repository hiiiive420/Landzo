import { AppError } from "../common/errors/AppError.js";

export const notFound = (req, _res, next) => {
  next(new AppError(404, "Route not found", "ROUTE_NOT_FOUND", { method: req.method }));
};
