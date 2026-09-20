import { Router } from "express";
import { successResponse } from "../common/responses/apiResponse.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.status(200).json(
    successResponse({
      message: "LANDZO API is healthy",
      data: {
        status: "ok",
        service: "landzo-backend",
        timestamp: new Date().toISOString(),
      },
    }),
  );
});
