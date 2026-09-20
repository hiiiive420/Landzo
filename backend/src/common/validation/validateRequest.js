import { AppError } from "../errors/AppError.js";

const formatIssues = (issues) =>
  issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));

export const validateRequest = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    next(
      new AppError(400, "Validation failed", "VALIDATION_ERROR", formatIssues(result.error.issues)),
    );
    return;
  }

  req.validated = result.data;
  next();
};
